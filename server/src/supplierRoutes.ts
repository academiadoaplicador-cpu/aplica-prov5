import { Router, type Request, type Response } from 'express';
import type { Pool, PoolClient } from 'pg';
import { resolveCatalogUserId } from './catalog.js';
import { isValidEmail } from './email.js';
import { digitsOnlyCnpj, isValidCnpj } from './cnpj.js';
import { fetchCnpjLookup } from './cnpjLookup.js';

export interface SupplierProductLinkInput {
  brand: string;
  line: string;
  isPrimary?: boolean;
}

export interface SupplierContactInput {
  id?: string;
  city: string;
  state: string;
  whatsapp: string;
}

export interface SupplierPartnerInput {
  name: string;
  role: string;
}

export interface SupplierInput {
  legalName?: string;
  /** @deprecated use legalName */
  name?: string;
  tradeName?: string;
  cnpj?: string;
  address?: string;
  registrationStatus?: string;
  partners?: SupplierPartnerInput[];
  email?: string | null;
  isActive?: boolean;
  contacts?: SupplierContactInput[];
  /** @deprecated use contacts */
  whatsapp?: string;
  /** @deprecated */
  cep?: string | null;
  productLinks?: SupplierProductLinkInput[];
}

const BRAZILIAN_UF = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', 'NA',
]);

function parsePage(value: unknown, fallback = 1): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function parseLimit(value: unknown, fallback = 20, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function newContactId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function mapProductLink(row: Record<string, unknown>) {
  return {
    brand: row.brand as string,
    line: row.line as string,
    isPrimary: Boolean(row.is_primary),
  };
}

function mapContact(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    city: row.city as string,
    state: row.state as string,
    whatsapp: row.whatsapp as string,
  };
}

function parsePartnersFromRow(value: unknown): { name: string; role: string }[] {
  if (!value) return [];
  let arr: unknown[] = [];
  if (typeof value === 'string') {
    try {
      arr = JSON.parse(value) as unknown[];
    } catch {
      return [];
    }
  } else if (Array.isArray(value)) {
    arr = value;
  } else {
    return [];
  }

  return arr
    .map((item) => {
      const obj = item as Record<string, unknown>;
      const name = String(obj.name ?? obj.nome ?? '').trim();
      const role = String(obj.role ?? obj.qual ?? '').trim();
      return name ? { name, role } : null;
    })
    .filter((item): item is { name: string; role: string } => item !== null);
}

function normalizePartners(body: SupplierInput): { name: string; role: string }[] {
  if (!Array.isArray(body.partners)) return [];
  return body.partners
    .map((partner) => ({
      name: String(partner.name ?? '').trim(),
      role: String(partner.role ?? '').trim(),
    }))
    .filter((partner) => partner.name);
}

function extractProfileFields(body: SupplierInput) {
  const tradeName = String(body.tradeName ?? '').trim() || null;
  const address = String(body.address ?? '').trim() || null;
  const registrationStatus = String(body.registrationStatus ?? '').trim() || null;
  const partners = JSON.stringify(normalizePartners(body));
  return { tradeName, address, registrationStatus, partners };
}

function mapSupplier(
  row: Record<string, unknown>,
  links: ReturnType<typeof mapProductLink>[] = [],
  contacts: ReturnType<typeof mapContact>[] = [],
) {
  const legalName = (row.legal_name as string) || (row.name as string);
  return {
    id: row.id as string,
    legalName,
    tradeName: (row.trade_name as string) || undefined,
    cnpj: row.cnpj as string,
    address: (row.address as string) || undefined,
    registrationStatus: (row.registration_status as string) || undefined,
    partners: parsePartnersFromRow(row.partners),
    email: (row.email as string) || undefined,
    isActive: row.is_active !== false,
    createdAt: row.created_at
      ? new Date(row.created_at as string | Date).toISOString()
      : undefined,
    updatedAt: row.updated_at
      ? new Date(row.updated_at as string | Date).toISOString()
      : undefined,
    contacts,
    productLinks: links,
  };
}

function mapSupplierListItem(row: Record<string, unknown>) {
  const legalName = (row.legal_name as string) || (row.name as string);
  return {
    id: row.id as string,
    legalName,
    cnpj: row.cnpj as string,
    email: (row.email as string) || undefined,
    isActive: row.is_active !== false,
    contactCount: Number(row.contact_count) || 0,
    productLinkCount: Number(row.product_link_count) || 0,
  };
}

function normalizeContacts(body: SupplierInput): SupplierContactInput[] {
  if (Array.isArray(body.contacts) && body.contacts.length > 0) {
    const result: SupplierContactInput[] = [];
    for (const contact of body.contacts) {
      const city = String(contact.city ?? '').trim();
      const state = String(contact.state ?? '').trim().toUpperCase();
      const whatsapp = digitsOnly(String(contact.whatsapp ?? ''));
      if (!city || !state || !whatsapp) continue;
      result.push({
        id: contact.id,
        city,
        state,
        whatsapp,
      });
    }
    return result;
  }

  const legacyWhatsapp = digitsOnly(String(body.whatsapp ?? ''));
  if (legacyWhatsapp.length >= 10) {
    return [{ city: 'Não informada', state: 'NA', whatsapp: legacyWhatsapp }];
  }

  return [];
}

function validateSupplierInput(body: SupplierInput): string | null {
  const legalName = String(body.legalName ?? body.name ?? '').trim();
  const cnpj = digitsOnlyCnpj(String(body.cnpj ?? ''));
  const email = body.email ? String(body.email).trim() : '';
  const contacts = normalizeContacts(body);

  if (!legalName) return 'Razão social é obrigatória';
  if (!isValidCnpj(cnpj)) return 'CNPJ inválido';
  if (email && !isValidEmail(email)) return 'E-mail inválido';
  if (contacts.length === 0) return 'Cadastre ao menos um contato WhatsApp';

  for (const contact of contacts) {
    if (!contact.city.trim()) return 'Cidade do contato é obrigatória';
    if (!BRAZILIAN_UF.has(contact.state)) return `UF inválida: ${contact.state}`;
    if (contact.whatsapp.length < 10) return 'WhatsApp inválido (mínimo 10 dígitos)';
  }

  return null;
}

function normalizeProductLinks(links: SupplierProductLinkInput[] | undefined): SupplierProductLinkInput[] {
  if (!Array.isArray(links)) return [];
  const seen = new Set<string>();
  const result: SupplierProductLinkInput[] = [];

  for (const link of links) {
    const brand = String(link.brand ?? '').trim();
    const line = String(link.line ?? '').trim();
    if (!brand || !line) continue;
    const key = `${normalizeKey(brand)}::${normalizeKey(line)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ brand, line, isPrimary: Boolean(link.isPrimary) });
  }

  return result;
}

async function catalogHasBrandLine(
  db: Pool | PoolClient,
  catalogUserId: string,
  brand: string,
  line: string,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM materials
     WHERE user_id = $1
       AND LOWER(TRIM(brand)) = LOWER(TRIM($2))
       AND LOWER(TRIM(line)) = LOWER(TRIM($3))
     LIMIT 1`,
    [catalogUserId, brand, line],
  );
  return result.rows.length > 0;
}

async function validateProductLinks(
  db: Pool | PoolClient,
  catalogUserId: string,
  links: SupplierProductLinkInput[],
): Promise<string | null> {
  for (const link of links) {
    const exists = await catalogHasBrandLine(db, catalogUserId, link.brand, link.line);
    if (!exists) {
      return `Par Marca/Linha não encontrado no catálogo: ${link.brand} — ${link.line}`;
    }
  }
  return null;
}

/**
 * Remove vínculos que apontam para marca/linha que não existe mais no catálogo
 * (ex.: material excluído). Evita que um vínculo antigo travado bloqueie o
 * salvamento de fornecedores no cadastro/edição — diferente da importação em
 * lote, aqui não faz sentido rejeitar o formulário inteiro por causa disso.
 */
async function sanitizeProductLinks(
  db: Pool | PoolClient,
  catalogUserId: string,
  links: SupplierProductLinkInput[],
): Promise<SupplierProductLinkInput[]> {
  const result: SupplierProductLinkInput[] = [];
  for (const link of links) {
    const exists = await catalogHasBrandLine(db, catalogUserId, link.brand, link.line);
    if (exists) result.push(link);
  }
  return result;
}

async function clearPrimaryForPairs(
  client: PoolClient,
  catalogUserId: string,
  supplierId: string,
  links: SupplierProductLinkInput[],
): Promise<void> {
  for (const link of links) {
    if (!link.isPrimary) continue;
    await client.query(
      `UPDATE supplier_product_links
       SET is_primary = FALSE
       WHERE user_id = $1
         AND supplier_id != $2
         AND LOWER(TRIM(brand)) = LOWER(TRIM($3))
         AND LOWER(TRIM(line)) = LOWER(TRIM($4))`,
      [catalogUserId, supplierId, link.brand, link.line],
    );
  }
}

async function replaceProductLinks(
  client: PoolClient,
  catalogUserId: string,
  supplierId: string,
  links: SupplierProductLinkInput[],
): Promise<void> {
  await client.query(
    'DELETE FROM supplier_product_links WHERE user_id = $1 AND supplier_id = $2',
    [catalogUserId, supplierId],
  );

  for (const link of links) {
    await client.query(
      `INSERT INTO supplier_product_links (user_id, supplier_id, brand, line, is_primary)
       VALUES ($1, $2, $3, $4, $5)`,
      [catalogUserId, supplierId, link.brand, link.line, Boolean(link.isPrimary)],
    );
  }
}

async function replaceContacts(
  client: PoolClient,
  catalogUserId: string,
  supplierId: string,
  contacts: SupplierContactInput[],
): Promise<void> {
  await client.query(
    'DELETE FROM supplier_contacts WHERE user_id = $1 AND supplier_id = $2',
    [catalogUserId, supplierId],
  );

  for (const contact of contacts) {
    const id = contact.id?.trim() || newContactId();
    await client.query(
      `INSERT INTO supplier_contacts (user_id, supplier_id, id, city, state, whatsapp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [catalogUserId, supplierId, id, contact.city, contact.state, contact.whatsapp],
    );
  }
}

async function fetchSupplierLinks(
  db: Pool | PoolClient,
  catalogUserId: string,
  supplierId: string,
) {
  const result = await db.query(
    `SELECT brand, line, is_primary FROM supplier_product_links
     WHERE user_id = $1 AND supplier_id = $2
     ORDER BY brand, line`,
    [catalogUserId, supplierId],
  );
  return result.rows.map((row) => mapProductLink(row as Record<string, unknown>));
}

async function fetchSupplierContacts(
  db: Pool | PoolClient,
  catalogUserId: string,
  supplierId: string,
) {
  const result = await db.query(
    `SELECT id, city, state, whatsapp FROM supplier_contacts
     WHERE user_id = $1 AND supplier_id = $2
     ORDER BY state ASC, city ASC`,
    [catalogUserId, supplierId],
  );
  return result.rows.map((row) => mapContact(row as Record<string, unknown>));
}

export async function lookupSupplierForProduct(
  pool: Pool,
  brand: string,
  line: string,
) {
  const catalogUserId = await resolveCatalogUserId(pool);
  const brandTrim = brand.trim();
  const lineTrim = line.trim();
  if (!brandTrim || !lineTrim) return null;

  const result = await pool.query(
    `SELECT s.id, s.name, s.legal_name, s.cnpj, s.email, s.is_active,
            spl.brand, spl.line, spl.is_primary
     FROM suppliers s
     INNER JOIN supplier_product_links spl
       ON spl.user_id = s.user_id AND spl.supplier_id = s.id
     WHERE s.user_id = $1
       AND s.is_active = TRUE
       AND LOWER(TRIM(spl.brand)) = LOWER(TRIM($2))
       AND LOWER(TRIM(spl.line)) = LOWER(TRIM($3))
     ORDER BY spl.is_primary DESC, s.legal_name ASC, s.name ASC
     LIMIT 1`,
    [catalogUserId, brandTrim, lineTrim],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0] as Record<string, unknown>;
  const supplierId = row.id as string;
  const links = await fetchSupplierLinks(pool, catalogUserId, supplierId);
  const contacts = await fetchSupplierContacts(pool, catalogUserId, supplierId);
  if (contacts.length === 0) return null;

  return mapSupplier(row, links, contacts);
}

async function loadSupplierById(
  db: Pool | PoolClient,
  catalogUserId: string,
  supplierId: string,
) {
  const result = await db.query(
    `SELECT * FROM suppliers WHERE user_id = $1 AND id = $2`,
    [catalogUserId, supplierId],
  );
  if (result.rows.length === 0) return null;
  const links = await fetchSupplierLinks(db, catalogUserId, supplierId);
  const contacts = await fetchSupplierContacts(db, catalogUserId, supplierId);
  return mapSupplier(result.rows[0] as Record<string, unknown>, links, contacts);
}

export function createSupplierAdminRouter(pool: Pool): Router {
  const router = Router();

  router.get('/lookup-cnpj/:cnpj', async (req: Request, res: Response) => {
    try {
      const result = await fetchCnpjLookup(req.params.cnpj);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao consultar CNPJ';
      res.status(400).json({ error: message });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const page = parsePage(req.query.page);
      const limit = parseLimit(req.query.limit);
      const offset = (page - 1) * limit;
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const statusFilter =
        req.query.status === 'inactive'
          ? 'inactive'
          : req.query.status === 'all'
            ? 'all'
            : 'active';

      const params: unknown[] = [catalogUserId];
      let whereClause = 'WHERE s.user_id = $1';

      if (statusFilter === 'active') {
        whereClause += ' AND s.is_active = TRUE';
      } else if (statusFilter === 'inactive') {
        whereClause += ' AND s.is_active = FALSE';
      }

      if (q) {
        params.push(`%${q.toLowerCase()}%`);
        const idx = params.length;
        whereClause += ` AND (
          LOWER(COALESCE(s.legal_name, s.name)) LIKE $${idx}
          OR LOWER(COALESCE(s.cnpj, '')) LIKE $${idx}
          OR LOWER(COALESCE(s.email, '')) LIKE $${idx}
        )`;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM suppliers s ${whereClause}`,
        params,
      );
      const total = countResult.rows[0].count as number;

      const listParams = [...params, limit, offset];
      const listResult = await pool.query(
        `SELECT s.id, s.name, s.legal_name, s.cnpj, s.email, s.is_active,
                COUNT(DISTINCT sc.id)::int AS contact_count,
                COUNT(spl.brand)::int AS product_link_count
         FROM suppliers s
         LEFT JOIN supplier_contacts sc
           ON sc.user_id = s.user_id AND sc.supplier_id = s.id
         LEFT JOIN supplier_product_links spl
           ON spl.user_id = s.user_id AND spl.supplier_id = s.id
         ${whereClause}
         GROUP BY s.id, s.name, s.legal_name, s.cnpj, s.email, s.is_active
         ORDER BY COALESCE(s.legal_name, s.name) ASC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      );

      res.json({
        items: listResult.rows.map((row) => mapSupplierListItem(row as Record<string, unknown>)),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (e) {
      console.error('[admin/suppliers]', e);
      res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
  });

  router.post('/import', async (req: Request, res: Response) => {
    const incoming = (req.body.suppliers || []) as SupplierInput[];
    if (!Array.isArray(incoming) || incoming.length === 0) {
      res.status(400).json({ error: 'Nenhum fornecedor para importar' });
      return;
    }

    const client = await pool.connect();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const catalogUserId = await resolveCatalogUserId(client);
      await client.query('BEGIN');

      for (let i = 0; i < incoming.length; i++) {
        const body = incoming[i];
        const rowNum = i + 1;
        const validationError = validateSupplierInput(body);
        if (validationError) {
          errors.push(`Linha ${rowNum}: ${validationError}`);
          skipped++;
          continue;
        }

        const links = normalizeProductLinks(body.productLinks);
        const linksError = await validateProductLinks(client, catalogUserId, links);
        if (linksError) {
          errors.push(`Linha ${rowNum}: ${linksError}`);
          skipped++;
          continue;
        }

        const legalName = String(body.legalName ?? body.name).trim();
        const cnpj = digitsOnlyCnpj(String(body.cnpj));
        const email = body.email ? String(body.email).trim() : null;
        const isActive = body.isActive !== false;
        const contacts = normalizeContacts(body);
        const profile = extractProfileFields(body);

        const existing = await client.query(
          `SELECT id FROM suppliers
           WHERE user_id = $1 AND cnpj = $2`,
          [catalogUserId, cnpj],
        );

        let supplierId: string;
        if (existing.rows.length > 0) {
          supplierId = existing.rows[0].id as string;
          await client.query(
            `UPDATE suppliers
             SET name = $1, legal_name = $1, trade_name = $2, email = $3, address = $4,
                 registration_status = $5, partners = $6::jsonb, is_active = $7, updated_at = NOW()
             WHERE user_id = $8 AND id = $9`,
            [
              legalName,
              profile.tradeName,
              email,
              profile.address,
              profile.registrationStatus,
              profile.partners,
              isActive,
              catalogUserId,
              supplierId,
            ],
          );
          await replaceContacts(client, catalogUserId, supplierId, contacts);
          updated++;
        } else {
          supplierId = newContactId();
          await client.query(
            `INSERT INTO suppliers (
               user_id, id, name, legal_name, trade_name, cnpj, address,
               registration_status, partners, email, is_active
             )
             VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
            [
              catalogUserId,
              supplierId,
              legalName,
              profile.tradeName,
              cnpj,
              profile.address,
              profile.registrationStatus,
              profile.partners,
              email,
              isActive,
            ],
          );
          await replaceContacts(client, catalogUserId, supplierId, contacts);
          imported++;
        }

        if (links.length > 0) {
          const existingLinks = await client.query(
            `SELECT brand, line, is_primary FROM supplier_product_links
             WHERE user_id = $1 AND supplier_id = $2`,
            [catalogUserId, supplierId],
          );
          const mergedMap = new Map<string, SupplierProductLinkInput>();
          for (const row of existingLinks.rows) {
            const r = row as Record<string, unknown>;
            const brand = r.brand as string;
            const line = r.line as string;
            mergedMap.set(`${normalizeKey(brand)}::${normalizeKey(line)}`, {
              brand,
              line,
              isPrimary: Boolean(r.is_primary),
            });
          }
          for (const link of links) {
            const key = `${normalizeKey(link.brand)}::${normalizeKey(link.line)}`;
            const prev = mergedMap.get(key);
            mergedMap.set(key, {
              brand: link.brand,
              line: link.line,
              isPrimary: link.isPrimary || prev?.isPrimary || false,
            });
          }
          const mergedLinks = Array.from(mergedMap.values());
          await clearPrimaryForPairs(client, catalogUserId, supplierId, mergedLinks);
          await replaceProductLinks(client, catalogUserId, supplierId, mergedLinks);
        }
      }

      await client.query('COMMIT');
      res.json({ imported, updated, skipped, errors });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[admin/suppliers/import]', e);
      res.status(500).json({ error: 'Erro na importação de fornecedores' });
    } finally {
      client.release();
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const supplier = await loadSupplierById(pool, catalogUserId, req.params.id);
      if (!supplier) {
        res.status(404).json({ error: 'Fornecedor não encontrado' });
        return;
      }
      res.json(supplier);
    } catch (e) {
      console.error('[admin/suppliers/:id]', e);
      res.status(500).json({ error: 'Erro ao carregar fornecedor' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const body = req.body as SupplierInput;
    const validationError = validateSupplierInput(body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const client = await pool.connect();
    try {
      const catalogUserId = await resolveCatalogUserId(client);
      const links = await sanitizeProductLinks(
        client,
        catalogUserId,
        normalizeProductLinks(body.productLinks),
      );

      const id = newContactId();
      const legalName = String(body.legalName ?? body.name).trim();
      const cnpj = digitsOnlyCnpj(String(body.cnpj));
      const email = body.email ? String(body.email).trim() : null;
      const isActive = body.isActive !== false;
      const contacts = normalizeContacts(body);
      const profile = extractProfileFields(body);

      await client.query('BEGIN');
      await client.query(
        `INSERT INTO suppliers (
           user_id, id, name, legal_name, trade_name, cnpj, address,
           registration_status, partners, email, is_active
         )
         VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
        [
          catalogUserId,
          id,
          legalName,
          profile.tradeName,
          cnpj,
          profile.address,
          profile.registrationStatus,
          profile.partners,
          email,
          isActive,
        ],
      );

      await replaceContacts(client, catalogUserId, id, contacts);

      if (links.length > 0) {
        await clearPrimaryForPairs(client, catalogUserId, id, links);
        await replaceProductLinks(client, catalogUserId, id, links);
      }

      await client.query('COMMIT');
      const saved = await loadSupplierById(pool, catalogUserId, id);
      res.status(201).json(saved);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[admin/suppliers POST]', e);
      res.status(500).json({ error: 'Erro ao criar fornecedor' });
    } finally {
      client.release();
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const body = req.body as SupplierInput;
    const validationError = validateSupplierInput(body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const client = await pool.connect();
    try {
      const catalogUserId = await resolveCatalogUserId(client);
      const existing = await client.query(
        'SELECT id FROM suppliers WHERE user_id = $1 AND id = $2',
        [catalogUserId, req.params.id],
      );
      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Fornecedor não encontrado' });
        return;
      }

      const links = await sanitizeProductLinks(
        client,
        catalogUserId,
        normalizeProductLinks(body.productLinks),
      );

      const legalName = String(body.legalName ?? body.name).trim();
      const cnpj = digitsOnlyCnpj(String(body.cnpj));
      const email = body.email ? String(body.email).trim() : null;
      const isActive = body.isActive !== false;
      const contacts = normalizeContacts(body);
      const profile = extractProfileFields(body);

      await client.query('BEGIN');
      await client.query(
        `UPDATE suppliers
         SET name = $1, legal_name = $1, trade_name = $2, cnpj = $3, address = $4,
             registration_status = $5, partners = $6::jsonb, email = $7, is_active = $8,
             updated_at = NOW()
         WHERE user_id = $9 AND id = $10`,
        [
          legalName,
          profile.tradeName,
          cnpj,
          profile.address,
          profile.registrationStatus,
          profile.partners,
          email,
          isActive,
          catalogUserId,
          req.params.id,
        ],
      );

      await replaceContacts(client, catalogUserId, req.params.id, contacts);
      await clearPrimaryForPairs(client, catalogUserId, req.params.id, links);
      await replaceProductLinks(client, catalogUserId, req.params.id, links);
      await client.query('COMMIT');

      const saved = await loadSupplierById(pool, catalogUserId, req.params.id);
      res.json(saved);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[admin/suppliers PUT]', e);
      res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    } finally {
      client.release();
    }
  });

  router.post('/:id/active', async (req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const isActive = Boolean((req.body as { isActive?: boolean }).isActive);
      const result = await pool.query(
        `UPDATE suppliers SET is_active = $1, updated_at = NOW()
         WHERE user_id = $2 AND id = $3
         RETURNING id, name, legal_name, cnpj, email, is_active`,
        [isActive, catalogUserId, req.params.id],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Fornecedor não encontrado' });
        return;
      }
      const row = result.rows[0] as Record<string, unknown>;
      const countLinks = await pool.query(
        `SELECT COUNT(*)::int AS count FROM supplier_product_links
         WHERE user_id = $1 AND supplier_id = $2`,
        [catalogUserId, req.params.id],
      );
      const countContacts = await pool.query(
        `SELECT COUNT(*)::int AS count FROM supplier_contacts
         WHERE user_id = $1 AND supplier_id = $2`,
        [catalogUserId, req.params.id],
      );
      res.json({
        ...mapSupplierListItem({
          ...row,
          product_link_count: countLinks.rows[0].count,
          contact_count: countContacts.rows[0].count,
        }),
      });
    } catch (e) {
      console.error('[admin/suppliers active]', e);
      res.status(500).json({ error: 'Erro ao alterar status' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const result = await pool.query(
        'DELETE FROM suppliers WHERE user_id = $1 AND id = $2 RETURNING id',
        [catalogUserId, req.params.id],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Fornecedor não encontrado' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('[admin/suppliers DELETE]', e);
      res.status(500).json({ error: 'Erro ao excluir fornecedor' });
    }
  });

  return router;
}
