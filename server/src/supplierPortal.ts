import { Router, type NextFunction, type Request, type Response } from 'express';
import type { Pool, PoolClient } from 'pg';
import { getUserRole, isAdminEmail, reservedEmailMessage } from './admin.js';
import { resolveCatalogUserId } from './catalog.js';
import { digitsOnlyCnpj, isValidCnpj } from './cnpj.js';
import { isValidEmail, normalizeEmail } from './email.js';
import { getPasswordValidationMessage } from './password.js';
import { hashPassword } from './userProvisioning.js';
import {
  BRAZILIAN_UF,
  loadSupplierById,
  newContactId,
  normalizeContacts,
  normalizeProductLinks,
  replaceContacts,
  replaceProductLinks,
  sanitizeProductLinks,
  type SupplierContactInput,
  type SupplierInput,
} from './supplierRoutes.js';

/**
 * Perfil do fornecedor.
 *
 * O cadastro do fornecedor continua sendo a linha de `suppliers` (a que o
 * aplicador consulta no botão WhatsApp). A conta de login (`users.role =
 * 'supplier'`) aponta para ela por `suppliers.account_user_id`.
 *
 * Regras de edição:
 * - direto: nome fantasia, e-mail, endereço e contatos WhatsApp;
 * - com aprovação do admin: razão social, CNPJ e marcas/linhas atendidas;
 * - só leitura: situação cadastral, sócios, ativo/inativo e fornecedor principal.
 */

interface SupplierKey {
  catalogUserId: string;
  supplierId: string;
}

interface ChangeSet {
  legalName?: string;
  cnpj?: string;
  productLinks?: { brand: string; line: string }[];
}

declare global {
  namespace Express {
    interface Request {
      supplierKey?: SupplierKey;
    }
  }
}

function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function iso(value: unknown): string | undefined {
  return value ? new Date(value as string | Date).toISOString() : undefined;
}

function parseChanges(value: unknown): ChangeSet {
  const raw = (typeof value === 'string' ? JSON.parse(value) : value) as Record<string, unknown>;
  const result: ChangeSet = {};
  if (typeof raw?.legalName === 'string') result.legalName = raw.legalName;
  if (typeof raw?.cnpj === 'string') result.cnpj = raw.cnpj;
  if (Array.isArray(raw?.productLinks)) {
    result.productLinks = (raw.productLinks as Record<string, unknown>[]).map((link) => ({
      brand: String(link.brand ?? ''),
      line: String(link.line ?? ''),
    }));
  }
  return result;
}

function mapChangeRequest(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    status: row.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
    changes: parseChanges(row.changes),
    adminNote: (row.admin_note as string) || undefined,
    createdAt: iso(row.created_at)!,
    reviewedAt: iso(row.reviewed_at),
  };
}

function pairKey(brand: string, line: string): string {
  return `${brand.trim().toLowerCase()}::${line.trim().toLowerCase()}`;
}

function sameLinkSet(
  a: { brand: string; line: string }[],
  b: { brand: string; line: string }[],
): boolean {
  const keysA = new Set(a.map((l) => pairKey(l.brand, l.line)));
  const keysB = new Set(b.map((l) => pairKey(l.brand, l.line)));
  return keysA.size === keysB.size && [...keysA].every((key) => keysB.has(key));
}

/** Contatos WhatsApp: mesmas regras do cadastro feito pelo admin. */
function validateContacts(contacts: SupplierContactInput[]): string | null {
  if (contacts.length === 0) return 'Cadastre ao menos um contato WhatsApp';
  for (const contact of contacts) {
    if (!contact.city.trim()) return 'Cidade do contato é obrigatória';
    if (!BRAZILIAN_UF.has(contact.state)) return `UF inválida: ${contact.state}`;
    if (contact.whatsapp.length < 10) return 'WhatsApp inválido (mínimo 10 dígitos)';
  }
  return null;
}

async function pendingRequest(db: Pool | PoolClient, key: SupplierKey) {
  const result = await db.query(
    `SELECT * FROM supplier_change_requests
     WHERE catalog_user_id = $1 AND supplier_id = $2 AND status = 'pending'`,
    [key.catalogUserId, key.supplierId],
  );
  return result.rows[0] ? mapChangeRequest(result.rows[0] as Record<string, unknown>) : null;
}

/** Última solicitação já analisada — para o fornecedor ver se foi recusada e por quê. */
async function lastReviewedRequest(db: Pool | PoolClient, key: SupplierKey) {
  const result = await db.query(
    `SELECT * FROM supplier_change_requests
     WHERE catalog_user_id = $1 AND supplier_id = $2 AND status IN ('approved', 'rejected')
     ORDER BY reviewed_at DESC NULLS LAST
     LIMIT 1`,
    [key.catalogUserId, key.supplierId],
  );
  return result.rows[0] ? mapChangeRequest(result.rows[0] as Record<string, unknown>) : null;
}

async function loadOwnProfile(db: Pool | PoolClient, key: SupplierKey) {
  const supplier = await loadSupplierById(db, key.catalogUserId, key.supplierId);
  if (!supplier) return null;
  return {
    supplier,
    pendingRequest: await pendingRequest(db, key),
    lastReviewedRequest: await lastReviewedRequest(db, key),
  };
}

// ---------------------------------------------------------------------------
// Área do fornecedor: /api/supplier
// ---------------------------------------------------------------------------

export function createSupplierSelfRouter(pool: Pool): Router {
  const router = Router();

  /**
   * Resolve o cadastro SEMPRE pela conta logada — nenhuma rota aceita id de
   * fornecedor vindo da requisição, então não há como ler ou alterar outro.
   */
  router.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const role = await getUserRole(pool, req.userId);
      if (role !== 'supplier') {
        res.status(403).json({ error: 'Acesso restrito a contas de fornecedor' });
        return;
      }
      const result = await pool.query(
        `SELECT s.user_id, s.id FROM suppliers s
         JOIN users u ON u.id = s.account_user_id
         WHERE s.account_user_id = $1 AND COALESCE(u.is_active, TRUE) = TRUE`,
        [req.userId],
      );
      if (result.rows.length === 0) {
        res.status(403).json({
          error: 'Esta conta não está ligada a nenhum fornecedor. Fale com a administração.',
        });
        return;
      }
      req.supplierKey = {
        catalogUserId: result.rows[0].user_id as string,
        supplierId: result.rows[0].id as string,
      };
      next();
    } catch (e) {
      console.error('[supplier/auth]', e);
      res.status(500).json({ error: 'Erro ao validar acesso' });
    }
  });

  router.get('/profile', async (req: Request, res: Response) => {
    try {
      const profile = await loadOwnProfile(pool, req.supplierKey!);
      if (!profile) {
        res.status(404).json({ error: 'Cadastro não encontrado' });
        return;
      }
      res.json(profile);
    } catch (e) {
      console.error('[supplier/profile]', e);
      res.status(500).json({ error: 'Erro ao carregar o cadastro' });
    }
  });

  /** Campos que valem na hora: nome fantasia, e-mail, endereço e contatos. */
  router.put('/profile', async (req: Request, res: Response) => {
    const body = req.body as Pick<SupplierInput, 'tradeName' | 'email' | 'address' | 'contacts'>;
    const tradeName = String(body.tradeName ?? '').trim().slice(0, 160) || null;
    const address = String(body.address ?? '').trim().slice(0, 300) || null;
    const email = String(body.email ?? '').trim() || null;
    const contacts = normalizeContacts({ contacts: body.contacts } as SupplierInput);

    if (email && !isValidEmail(email)) {
      res.status(400).json({ error: 'E-mail inválido' });
      return;
    }
    const contactsError = validateContacts(contacts);
    if (contactsError) {
      res.status(400).json({ error: contactsError });
      return;
    }

    const key = req.supplierKey!;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE suppliers
         SET trade_name = $1, email = $2, address = $3, updated_at = NOW()
         WHERE user_id = $4 AND id = $5`,
        [tradeName, email, address, key.catalogUserId, key.supplierId],
      );
      await replaceContacts(
        client,
        key.catalogUserId,
        key.supplierId,
        contacts.map((c) => ({ ...c, id: c.id?.trim() || newContactId() })),
      );
      await client.query('COMMIT');
      res.json(await loadOwnProfile(pool, key));
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[supplier/profile PUT]', e);
      res.status(500).json({ error: 'Erro ao salvar o cadastro' });
    } finally {
      client.release();
    }
  });

  /** Pares Marca/Linha do catálogo, para o fornecedor escolher o que atende. */
  router.get('/catalog-lines', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT DISTINCT brand, line, type FROM materials
         WHERE user_id = $1 AND TRIM(COALESCE(brand, '')) <> ''
         ORDER BY brand, line`,
        [req.supplierKey!.catalogUserId],
      );
      res.json(
        result.rows.map((row) => ({
          brand: row.brand as string,
          line: (row.line as string) ?? '',
          type: (row.type as string) ?? '',
        })),
      );
    } catch (e) {
      console.error('[supplier/catalog-lines]', e);
      res.status(500).json({ error: 'Erro ao carregar o catálogo' });
    }
  });

  /**
   * Pede alteração de razão social, CNPJ e/ou marcas/linhas. Guarda só o que
   * difere do cadastro atual; uma nova solicitação substitui a pendente.
   */
  router.post('/change-request', async (req: Request, res: Response) => {
    const body = req.body as {
      legalName?: string;
      cnpj?: string;
      productLinks?: { brand: string; line: string }[];
    };
    const key = req.supplierKey!;
    try {
      const current = await loadSupplierById(pool, key.catalogUserId, key.supplierId);
      if (!current) {
        res.status(404).json({ error: 'Cadastro não encontrado' });
        return;
      }

      const changes: ChangeSet = {};

      if (body.legalName !== undefined) {
        const legalName = String(body.legalName).trim().slice(0, 200);
        if (!legalName) {
          res.status(400).json({ error: 'Razão social é obrigatória' });
          return;
        }
        if (legalName !== current.legalName) changes.legalName = legalName;
      }

      if (body.cnpj !== undefined) {
        const cnpj = digitsOnlyCnpj(String(body.cnpj));
        if (!isValidCnpj(cnpj)) {
          res.status(400).json({ error: 'CNPJ inválido' });
          return;
        }
        if (cnpj !== digitsOnlyCnpj(current.cnpj ?? '')) changes.cnpj = cnpj;
      }

      if (body.productLinks !== undefined) {
        const requested = normalizeProductLinks(
          (Array.isArray(body.productLinks) ? body.productLinks : []).map((link) => ({
            brand: link.brand,
            line: link.line,
          })),
        );
        const valid = await sanitizeProductLinks(pool, key.catalogUserId, requested);
        if (valid.length !== requested.length) {
          res.status(400).json({ error: 'Há marca/linha que não existe no catálogo.' });
          return;
        }
        if (!sameLinkSet(valid, current.productLinks)) {
          changes.productLinks = valid.map(({ brand, line }) => ({ brand, line }));
        }
      }

      if (Object.keys(changes).length === 0) {
        res.status(400).json({ error: 'Nada mudou em relação ao cadastro atual.' });
        return;
      }

      const existing = await pendingRequest(pool, key);
      if (existing) {
        await pool.query(
          `UPDATE supplier_change_requests
           SET changes = $1::jsonb, created_at = NOW(), requested_by = $2
           WHERE id = $3`,
          [JSON.stringify(changes), req.userId, existing.id],
        );
      } else {
        await pool.query(
          `INSERT INTO supplier_change_requests
             (id, catalog_user_id, supplier_id, requested_by, changes)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [newId(), key.catalogUserId, key.supplierId, req.userId, JSON.stringify(changes)],
        );
      }
      res.json(await loadOwnProfile(pool, key));
    } catch (e) {
      console.error('[supplier/change-request]', e);
      res.status(500).json({ error: 'Erro ao enviar a solicitação' });
    }
  });

  router.delete('/change-request', async (req: Request, res: Response) => {
    const key = req.supplierKey!;
    try {
      await pool.query(
        `UPDATE supplier_change_requests
         SET status = 'cancelled', reviewed_at = NOW()
         WHERE catalog_user_id = $1 AND supplier_id = $2 AND status = 'pending'`,
        [key.catalogUserId, key.supplierId],
      );
      res.json(await loadOwnProfile(pool, key));
    } catch (e) {
      console.error('[supplier/change-request DELETE]', e);
      res.status(500).json({ error: 'Erro ao cancelar a solicitação' });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Admin: acesso do fornecedor e aprovação — /api/admin/suppliers/:id/...
// ---------------------------------------------------------------------------

async function loadAccount(db: Pool | PoolClient, catalogUserId: string, supplierId: string) {
  const result = await db.query(
    `SELECT u.id, u.email, COALESCE(u.is_active, TRUE) AS is_active, u.last_login_at, u.created_at
     FROM suppliers s
     JOIN users u ON u.id = s.account_user_id
     WHERE s.user_id = $1 AND s.id = $2`,
    [catalogUserId, supplierId],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    userId: row.id as string,
    email: row.email as string,
    isActive: row.is_active !== false,
    lastLoginAt: iso(row.last_login_at),
    createdAt: iso(row.created_at),
  };
}

export function createSupplierPortalAdminRouter(pool: Pool): Router {
  const router = Router();

  async function supplierExists(catalogUserId: string, supplierId: string) {
    const result = await pool.query(
      'SELECT legal_name, name, trade_name, account_user_id FROM suppliers WHERE user_id = $1 AND id = $2',
      [catalogUserId, supplierId],
    );
    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  router.get('/:id/account', async (req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      if (!(await supplierExists(catalogUserId, req.params.id))) {
        res.status(404).json({ error: 'Fornecedor não encontrado' });
        return;
      }
      res.json({ account: await loadAccount(pool, catalogUserId, req.params.id) });
    } catch (e) {
      console.error('[admin/suppliers/account]', e);
      res.status(500).json({ error: 'Erro ao carregar o acesso' });
    }
  });

  /** Cria o login do fornecedor, ligado a este cadastro. */
  router.post('/:id/account', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !isValidEmail(email)) {
      res.status(400).json({ error: 'Informe um e-mail válido' });
      return;
    }
    const passwordError = getPasswordValidationMessage(String(password ?? ''));
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }
    const normalizedEmail = normalizeEmail(email);
    if (isAdminEmail(normalizedEmail)) {
      res.status(403).json({ error: reservedEmailMessage() });
      return;
    }

    const client = await pool.connect();
    try {
      const catalogUserId = await resolveCatalogUserId(client);
      await client.query('BEGIN');
      const supplier = await client.query(
        `SELECT legal_name, name, trade_name, account_user_id FROM suppliers
         WHERE user_id = $1 AND id = $2 FOR UPDATE`,
        [catalogUserId, req.params.id],
      );
      if (supplier.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Fornecedor não encontrado' });
        return;
      }
      const row = supplier.rows[0] as Record<string, unknown>;
      if (row.account_user_id) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'Este fornecedor já tem acesso. Remova o atual para criar outro.' });
        return;
      }
      const taken = await client.query('SELECT 1 FROM users WHERE email = $1', [normalizedEmail]);
      if (taken.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
        return;
      }

      const userId = newId();
      const passwordHash = await hashPassword(String(password));
      const businessName = String(row.trade_name || row.legal_name || row.name || 'Fornecedor').slice(0, 120);
      await client.query(
        `INSERT INTO users (id, email, business_name, password_hash, is_active, role, created_by)
         VALUES ($1, $2, $3, $4, TRUE, 'supplier', $5)`,
        [userId, normalizedEmail, businessName, passwordHash, req.userId ?? null],
      );
      await client.query(
        'UPDATE suppliers SET account_user_id = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3',
        [userId, catalogUserId, req.params.id],
      );
      await client.query('COMMIT');
      res.status(201).json({ account: await loadAccount(pool, catalogUserId, req.params.id) });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[admin/suppliers/account POST]', e);
      res.status(500).json({ error: 'Erro ao criar o acesso' });
    } finally {
      client.release();
    }
  });

  router.post('/:id/account/password', async (req: Request, res: Response) => {
    const { password } = req.body as { password?: string };
    const passwordError = getPasswordValidationMessage(String(password ?? ''));
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const account = await loadAccount(pool, catalogUserId, req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Este fornecedor ainda não tem acesso' });
        return;
      }
      const passwordHash = await hashPassword(String(password));
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'supplier'", [
        passwordHash,
        account.userId,
      ]);
      res.json({ account });
    } catch (e) {
      console.error('[admin/suppliers/account password]', e);
      res.status(500).json({ error: 'Erro ao redefinir a senha' });
    }
  });

  /** Remove o login: a conta é apagada e o cadastro do fornecedor continua. */
  router.delete('/:id/account', async (req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const account = await loadAccount(pool, catalogUserId, req.params.id);
      if (account) {
        await pool.query("DELETE FROM users WHERE id = $1 AND role = 'supplier'", [account.userId]);
      }
      res.status(204).send();
    } catch (e) {
      console.error('[admin/suppliers/account DELETE]', e);
      res.status(500).json({ error: 'Erro ao remover o acesso' });
    }
  });

  router.get('/:id/change-requests', async (req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const result = await pool.query(
        `SELECT * FROM supplier_change_requests
         WHERE catalog_user_id = $1 AND supplier_id = $2
         ORDER BY (status = 'pending') DESC, created_at DESC
         LIMIT 10`,
        [catalogUserId, req.params.id],
      );
      res.json(result.rows.map((row) => mapChangeRequest(row as Record<string, unknown>)));
    } catch (e) {
      console.error('[admin/suppliers/change-requests]', e);
      res.status(500).json({ error: 'Erro ao carregar as solicitações' });
    }
  });

  /** Aplica a solicitação no cadastro usado pelo sistema. */
  router.post('/:id/change-requests/:requestId/approve', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const catalogUserId = await resolveCatalogUserId(client);
      await client.query('BEGIN');
      const found = await client.query(
        `SELECT * FROM supplier_change_requests
         WHERE id = $1 AND catalog_user_id = $2 AND supplier_id = $3 AND status = 'pending'
         FOR UPDATE`,
        [req.params.requestId, catalogUserId, req.params.id],
      );
      if (found.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Solicitação não encontrada ou já analisada' });
        return;
      }
      const changes = parseChanges(found.rows[0].changes);

      if (changes.legalName !== undefined || changes.cnpj !== undefined) {
        if (changes.cnpj !== undefined && !isValidCnpj(changes.cnpj)) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'CNPJ da solicitação é inválido' });
          return;
        }
        await client.query(
          `UPDATE suppliers
           SET name = COALESCE($1, name), legal_name = COALESCE($1, legal_name),
               cnpj = COALESCE($2, cnpj), updated_at = NOW()
           WHERE user_id = $3 AND id = $4`,
          [changes.legalName ?? null, changes.cnpj ?? null, catalogUserId, req.params.id],
        );
      }

      if (changes.productLinks !== undefined) {
        // Mantém a marcação de "principal" dos pares que continuam; pares novos
        // entram sem ela (quem decide o principal é o admin).
        const current = await client.query(
          `SELECT brand, line, is_primary FROM supplier_product_links
           WHERE user_id = $1 AND supplier_id = $2`,
          [catalogUserId, req.params.id],
        );
        const primary = new Set(
          current.rows
            .filter((row) => row.is_primary)
            .map((row) => pairKey(row.brand as string, row.line as string)),
        );
        const links = await sanitizeProductLinks(
          client,
          catalogUserId,
          normalizeProductLinks(changes.productLinks),
        );
        await replaceProductLinks(
          client,
          catalogUserId,
          req.params.id,
          links.map((link) => ({ ...link, isPrimary: primary.has(pairKey(link.brand, link.line)) })),
        );
      }

      await client.query(
        `UPDATE supplier_change_requests
         SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
         WHERE id = $2`,
        [req.userId ?? null, req.params.requestId],
      );
      await client.query('COMMIT');
      res.json(await loadSupplierById(pool, catalogUserId, req.params.id));
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[admin/suppliers/change-requests approve]', e);
      res.status(500).json({ error: 'Erro ao aprovar a solicitação' });
    } finally {
      client.release();
    }
  });

  router.post('/:id/change-requests/:requestId/reject', async (req: Request, res: Response) => {
    const note = String((req.body as { note?: string }).note ?? '').trim().slice(0, 500) || null;
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const result = await pool.query(
        `UPDATE supplier_change_requests
         SET status = 'rejected', admin_note = $1, reviewed_at = NOW(), reviewed_by = $2
         WHERE id = $3 AND catalog_user_id = $4 AND supplier_id = $5 AND status = 'pending'
         RETURNING id`,
        [note, req.userId ?? null, req.params.requestId, catalogUserId, req.params.id],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Solicitação não encontrada ou já analisada' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('[admin/suppliers/change-requests reject]', e);
      res.status(500).json({ error: 'Erro ao recusar a solicitação' });
    }
  });

  return router;
}
