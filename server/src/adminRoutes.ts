import { Router, type Request, type Response } from 'express';
import type { Pool, PoolClient } from 'pg';
import { getAdminEmail, isAdminEmail } from './admin.js';
import { resolveCatalogUserId } from './catalog.js';
import { mapBudget, mapFinancial } from './budgetMappers.js';
import { mapProfileRow, type ProfileAddressInput } from './profileData.js';
import { countIncompleteVehicles } from './vehicleCompleteness.js';
import { createApplicatorUser, hashPassword } from './userProvisioning.js';
import { isValidEmail, normalizeEmail } from './email.js';
import { getPasswordValidationMessage } from './password.js';
import { createSupplierAdminRouter } from './supplierRoutes.js';
import { createPromotionAdminRouter } from './promotionRoutes.js';
import { fetchCnpjLookup } from './cnpjLookup.js';

function num(value: unknown): number {
  return Number(value);
}

function parsePage(value: unknown, fallback = 1): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function parseLimit(value: unknown, fallback = 20, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

function adminEmailParam(): string {
  return getAdminEmail() || '__no_admin__';
}

async function isApplicatorUser(pool: Pool, userId: string): Promise<boolean> {
  const result = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) return false;
  return !isAdminEmail(result.rows[0].email as string);
}

function mapAdminUserFields(row: Record<string, unknown>) {
  return {
    isActive: row.is_active !== false,
    lastLoginAt: row.last_login_at
      ? new Date(row.last_login_at as string | Date).toISOString()
      : undefined,
    createdBy: (row.created_by as string) || undefined,
  };
}

function mapAdminListUser(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    businessName: row.business_name as string,
    fullName: (row.full_name as string) || undefined,
    city: (row.city as string) || undefined,
    stateCode: (row.state_code as string) || undefined,
    areasOfExpertise: (row.areas_of_expertise as string[]) || [],
    verifiedDocuments: Boolean(row.verified_documents),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    budgetCount: row.budget_count as number,
    totalRevenue: num(row.total_revenue),
    pendingCount: row.pending_count as number,
    lastBudgetDate: (row.last_budget_date as string) || undefined,
    ...mapAdminUserFields(row),
  };
}

export function createAdminRouter(pool: Pool): Router {
  const router = Router();

  router.post('/suppliers/cnpj-lookup', async (req: Request, res: Response) => {
    const cnpj = String((req.body as { cnpj?: string })?.cnpj ?? '').trim();
    if (!cnpj) {
      res.status(400).json({ error: 'CNPJ é obrigatório' });
      return;
    }
    try {
      const result = await fetchCnpjLookup(cnpj);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao consultar CNPJ';
      res.status(400).json({ error: message });
    }
  });

  router.use('/suppliers', createSupplierAdminRouter(pool));
  router.use('/promotions', createPromotionAdminRouter(pool));

  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const adminEmail = adminEmailParam();
      const catalogUserId = await resolveCatalogUserId(pool);

      const [
        activeUsersResult,
        inactiveUsersResult,
        newUsersResult,
        budgetAggResult,
        gmvResult,
        profitResult,
        typeResult,
        engagedApplicantsResult,
        materialsResult,
        vehiclesResult,
        appliancesResult,
        vehiclesRowsResult,
        activeSuppliersResult,
        totalSuppliersResult,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS count FROM users
           WHERE LOWER(email) != LOWER($1) AND COALESCE(is_active, TRUE) = TRUE`,
          [adminEmail],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM users
           WHERE LOWER(email) != LOWER($1) AND is_active = FALSE`,
          [adminEmail],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM users
           WHERE LOWER(email) != LOWER($1)
             AND created_at >= date_trunc('month', NOW())`,
          [adminEmail],
        ),
        pool.query(
          `SELECT status, COUNT(*)::int AS count FROM budgets b
           INNER JOIN users u ON u.id = b.user_id
           WHERE LOWER(u.email) != LOWER($1)
           GROUP BY status`,
          [adminEmail],
        ),
        pool.query(
          `SELECT COALESCE(SUM(b.total_price), 0)::float AS gmv FROM budgets b
           INNER JOIN users u ON u.id = b.user_id
           WHERE LOWER(u.email) != LOWER($1) AND b.status = 'Finalizado'`,
          [adminEmail],
        ),
        pool.query(
          `SELECT COALESCE(SUM(b.profit), 0)::float AS profit FROM budgets b
           INNER JOIN users u ON u.id = b.user_id
           WHERE LOWER(u.email) != LOWER($1) AND b.status = 'Finalizado'`,
          [adminEmail],
        ),
        pool.query(
          `SELECT b.type, COUNT(*)::int AS count FROM budgets b
           INNER JOIN users u ON u.id = b.user_id
           WHERE LOWER(u.email) != LOWER($1)
           GROUP BY b.type`,
          [adminEmail],
        ),
        pool.query(
          `SELECT COUNT(DISTINCT b.user_id)::int AS count FROM budgets b
           INNER JOIN users u ON u.id = b.user_id
           WHERE LOWER(u.email) != LOWER($1)
             AND b.date::timestamptz >= NOW() - INTERVAL '30 days'`,
          [adminEmail],
        ),
        pool.query('SELECT COUNT(*)::int AS count FROM materials WHERE user_id = $1', [
          catalogUserId,
        ]),
        pool.query('SELECT COUNT(*)::int AS count FROM vehicles WHERE user_id = $1', [
          catalogUserId,
        ]),
        pool.query('SELECT COUNT(*)::int AS count FROM appliances WHERE user_id = $1', [
          catalogUserId,
        ]),
        pool.query('SELECT size, part_measurements FROM vehicles WHERE user_id = $1', [
          catalogUserId,
        ]),
        pool.query(
          'SELECT COUNT(*)::int AS count FROM suppliers WHERE user_id = $1 AND is_active = TRUE',
          [catalogUserId],
        ),
        pool.query('SELECT COUNT(*)::int AS count FROM suppliers WHERE user_id = $1', [
          catalogUserId,
        ]),
      ]);

      const statusCounts: Record<string, number> = {};
      let totalBudgets = 0;
      for (const row of budgetAggResult.rows) {
        const count = row.count as number;
        statusCounts[row.status as string] = count;
        totalBudgets += count;
      }
      const finalized = statusCounts['Finalizado'] ?? 0;
      const pending = statusCounts['Pendente'] ?? 0;

      const budgetsByType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        budgetsByType[row.type as string] = row.count as number;
      }

      const vehiclesIncomplete = countIncompleteVehicles(
        vehiclesRowsResult.rows as { size: string; part_measurements: Record<string, { width: number; length: number }> }[],
      );

      res.json({
        totalApplicants: activeUsersResult.rows[0].count as number,
        inactiveApplicants: inactiveUsersResult.rows[0].count as number,
        newApplicantsThisMonth: newUsersResult.rows[0].count as number,
        activeApplicantsLast30Days: engagedApplicantsResult.rows[0].count as number,
        totalBudgets,
        budgetsByStatus: statusCounts,
        pendingBudgets: pending,
        finalizedBudgets: finalized,
        gmvFinalized: num(gmvResult.rows[0].gmv),
        profitFinalized: num(profitResult.rows[0].profit),
        conversionRate: totalBudgets > 0 ? finalized / totalBudgets : 0,
        budgetsByType,
        catalog: {
          materialsCount: materialsResult.rows[0].count as number,
          vehiclesCount: vehiclesResult.rows[0].count as number,
          appliancesCount: appliancesResult.rows[0].count as number,
          vehiclesIncomplete,
        },
        activeSuppliers: activeSuppliersResult.rows[0].count as number,
        totalSuppliers: totalSuppliersResult.rows[0].count as number,
      });
    } catch (e) {
      console.error('[admin/stats]', e);
      res.status(500).json({ error: 'Erro ao carregar estatísticas' });
    }
  });

  router.get('/users', async (req: Request, res: Response) => {
    try {
      const adminEmail = adminEmailParam();
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

      const params: unknown[] = [adminEmail];
      let searchClause = '';
      if (statusFilter === 'active') {
        searchClause += ' AND COALESCE(u.is_active, TRUE) = TRUE';
      } else if (statusFilter === 'inactive') {
        searchClause += ' AND u.is_active = FALSE';
      }
      if (q) {
        params.push(`%${q.toLowerCase()}%`);
        const idx = params.length;
        searchClause = ` AND (
          LOWER(u.business_name) LIKE $${idx}
          OR LOWER(u.email) LIKE $${idx}
          OR LOWER(COALESCE(p.city, '')) LIKE $${idx}
        )`;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM users u
         LEFT JOIN applicator_profiles p ON p.user_id = u.id
         WHERE LOWER(u.email) != LOWER($1)${searchClause}`,
        params,
      );
      const total = countResult.rows[0].count as number;

      params.push(limit, offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const listResult = await pool.query(
        `SELECT
           u.id,
           u.email,
           u.business_name,
           u.created_at,
           u.is_active,
           u.last_login_at,
           u.created_by,
           p.full_name,
           p.city,
           p.state_code,
           p.areas_of_expertise,
           p.verified_documents,
           COALESCE(bs.budget_count, 0)::int AS budget_count,
           COALESCE(bs.total_revenue, 0)::float AS total_revenue,
           COALESCE(bs.pending_count, 0)::int AS pending_count,
           bs.last_budget_date
         FROM users u
         LEFT JOIN applicator_profiles p ON p.user_id = u.id
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*)::int AS budget_count,
             COALESCE(SUM(CASE WHEN b.status = 'Finalizado' THEN b.total_price ELSE 0 END), 0) AS total_revenue,
             COUNT(*) FILTER (WHERE b.status = 'Pendente')::int AS pending_count,
             MAX(b.date) AS last_budget_date
           FROM budgets b
           WHERE b.user_id = u.id
         ) bs ON true
         WHERE LOWER(u.email) != LOWER($1)${searchClause}
         ORDER BY u.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      );

      res.json({
        items: listResult.rows.map(mapAdminListUser),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (e) {
      console.error('[admin/users]', e);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  });

  router.get('/users/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      if (!(await isApplicatorUser(pool, userId))) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const userResult = await pool.query(
        `SELECT id, email, business_name, created_at, is_active, last_login_at, created_by
         FROM users WHERE id = $1`,
        [userId],
      );
      const row = userResult.rows[0];

      const [profileResult, financialResult, budgetSummaryResult, recentBudgetsResult] =
        await Promise.all([
          pool.query('SELECT * FROM applicator_profiles WHERE user_id = $1', [userId]),
          pool.query('SELECT * FROM financial_settings WHERE user_id = $1', [userId]),
          pool.query(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'Pendente')::int AS pending,
               COUNT(*) FILTER (WHERE status = 'Aprovado')::int AS approved,
               COUNT(*) FILTER (WHERE status = 'Finalizado')::int AS finalized,
               COUNT(*) FILTER (WHERE status = 'Cancelado')::int AS canceled,
               COALESCE(SUM(CASE WHEN status = 'Finalizado' THEN total_price ELSE 0 END), 0)::float AS revenue,
               COALESCE(SUM(CASE WHEN status = 'Finalizado' THEN profit ELSE 0 END), 0)::float AS profit,
               COALESCE(AVG(CASE WHEN status = 'Finalizado' THEN total_price END), 0)::float AS avg_ticket,
               MAX(date) AS last_budget_date
             FROM budgets WHERE user_id = $1`,
            [userId],
          ),
          pool.query(
            'SELECT * FROM budgets WHERE user_id = $1 ORDER BY date DESC LIMIT 10',
            [userId],
          ),
        ]);

      const summary = budgetSummaryResult.rows[0];
      const total = summary.total as number;

      res.json({
        user: {
          id: row.id as string,
          email: row.email as string,
          businessName: row.business_name as string,
          createdAt: new Date(row.created_at as string | Date).toISOString(),
          ...mapAdminUserFields(row),
        },
        profile:
          profileResult.rows.length > 0 ? mapProfileRow(profileResult.rows[0]) : null,
        financialSettings:
          financialResult.rows.length > 0
            ? mapFinancial(financialResult.rows[0])
            : null,
        budgetSummary: {
          total,
          pending: summary.pending as number,
          approved: summary.approved as number,
          finalized: summary.finalized as number,
          canceled: summary.canceled as number,
          revenue: num(summary.revenue),
          profit: num(summary.profit),
          avgTicket: num(summary.avg_ticket),
          lastBudgetDate: (summary.last_budget_date as string) || undefined,
        },
        recentBudgets: recentBudgetsResult.rows.map(mapBudget),
      });
    } catch (e) {
      console.error('[admin/users/:id]', e);
      res.status(500).json({ error: 'Erro ao carregar usuário' });
    }
  });

  router.post('/users', async (req: Request, res: Response) => {
    const adminId = req.userId;
    if (!adminId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const body = req.body as {
      businessName?: string;
      email?: string;
      password?: string;
      profile?: ProfileAddressInput & {
        fullName?: string;
        experienceYears?: number;
        areasOfExpertise?: string[];
        phone?: string;
        phoneCountryCode?: string;
        phoneNational?: string;
        city?: string;
        stateCode?: string;
        street?: string;
        neighborhood?: string;
        cep?: string;
      };
    };

    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const result = await createApplicatorUser(client, {
        businessName: body.businessName || '',
        email: body.email || '',
        password: body.password || '',
        createdBy: adminId,
        profile: body.profile || {},
        relaxedAddress: true,
      });

      if (!result.ok) {
        await client.query('ROLLBACK');
        res.status(result.status).json({ error: result.error });
        return;
      }

      await client.query('COMMIT');
      res.status(201).json({
        id: result.id,
        email: result.email,
        businessName: result.businessName,
      });
    } catch (e) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* noop */
        }
      }
      console.error('[admin/users POST]', e);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    } finally {
      client?.release();
    }
  });

  const patchUserHandler = async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      if (!(await isApplicatorUser(pool, userId))) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const body = (req.body || {}) as {
        businessName?: string;
        email?: string;
        isActive?: boolean;
        newPassword?: string;
      };

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (typeof body.businessName === 'string' && body.businessName.trim()) {
        if (body.businessName.length > 120) {
          res.status(400).json({ error: 'Nome da oficina muito longo' });
          return;
        }
        updates.push(`business_name = $${idx++}`);
        values.push(body.businessName.trim());
      }

      if (typeof body.email === 'string' && body.email.trim()) {
        if (!isValidEmail(body.email)) {
          res.status(400).json({ error: 'E-mail inválido' });
          return;
        }
        const normalized = normalizeEmail(body.email);
        if (isAdminEmail(normalized)) {
          res.status(403).json({ error: 'Este e-mail é reservado ao administrador' });
          return;
        }
        const dup = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [normalized, userId],
        );
        if (dup.rows.length > 0) {
          res.status(409).json({ error: 'E-mail já em uso por outra conta' });
          return;
        }
        updates.push(`email = $${idx++}`);
        values.push(normalized);
      }

      if (typeof body.isActive === 'boolean') {
        updates.push(`is_active = $${idx++}`);
        values.push(body.isActive);
      }

      if (typeof body.newPassword === 'string' && body.newPassword) {
        const passwordMsg = getPasswordValidationMessage(body.newPassword);
        if (passwordMsg) {
          res.status(400).json({ error: passwordMsg });
          return;
        }
        const passwordHash = await hashPassword(body.newPassword);
        if (!passwordHash) {
          res.status(400).json({ error: 'Senha inválida' });
          return;
        }
        updates.push(`password_hash = $${idx++}`);
        values.push(passwordHash);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      values.push(userId);
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
         RETURNING id, email, business_name, created_at, is_active, last_login_at, created_by`,
        values,
      );

      const row = result.rows[0];
      res.json({
        id: row.id as string,
        email: row.email as string,
        businessName: row.business_name as string,
        createdAt: new Date(row.created_at as string | Date).toISOString(),
        ...mapAdminUserFields(row),
      });
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === '42703') {
        res.status(503).json({
          error:
            'Coluna do banco ausente. Reinicie o container da API (docker) para aplicar a migration 006.',
        });
        return;
      }
      console.error('[admin/users update]', e);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  };

  router.patch('/users/:id', patchUserHandler);
  router.put('/users/:id', patchUserHandler);

  router.post('/users/:id/active', async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      if (!(await isApplicatorUser(pool, userId))) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      const { isActive } = (req.body || {}) as { isActive?: boolean };
      if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'Campo isActive (boolean) é obrigatório' });
        return;
      }

      const result = await pool.query(
        `UPDATE users SET is_active = $1 WHERE id = $2
         RETURNING id, email, business_name, created_at, is_active, last_login_at, created_by`,
        [isActive, userId],
      );

      const row = result.rows[0];
      res.json({
        id: row.id as string,
        email: row.email as string,
        businessName: row.business_name as string,
        createdAt: new Date(row.created_at as string | Date).toISOString(),
        ...mapAdminUserFields(row),
      });
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === '42703') {
        res.status(503).json({
          error:
            'Coluna is_active ausente. Reinicie a API para rodar a migration 006.',
        });
        return;
      }
      console.error('[admin/users active]', e);
      res.status(500).json({ error: 'Erro ao alterar status da conta' });
    }
  });

  router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      if (!(await isApplicatorUser(pool, userId))) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const { confirmBusinessName } = (req.body || {}) as {
        confirmBusinessName?: string;
      };
      const userRow = await pool.query(
        'SELECT business_name FROM users WHERE id = $1',
        [userId],
      );
      const expected = userRow.rows[0].business_name as string;
      if (confirmBusinessName?.trim() !== expected) {
        res.status(400).json({
          error: 'Digite o nome exato da oficina para confirmar a exclusão',
        });
        return;
      }

      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      res.json({ ok: true });
    } catch (e) {
      console.error('[admin/users DELETE]', e);
      res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  });

  router.patch('/profiles/:userId/verify', async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      if (!(await isApplicatorUser(pool, userId))) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const body = (req.body || {}) as {
        verifiedDocuments?: boolean;
        rating?: number;
      };

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (typeof body.verifiedDocuments === 'boolean') {
        updates.push(`verified_documents = $${idx++}`);
        values.push(body.verifiedDocuments);
      }
      if (body.rating !== undefined) {
        const rating = Number(body.rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
          res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
          return;
        }
        updates.push(`rating = $${idx++}`);
        values.push(rating);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      values.push(userId);
      const result = await pool.query(
        `UPDATE applicator_profiles SET ${updates.join(', ')}
         WHERE user_id = $${idx}
         RETURNING *`,
        values,
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Perfil não encontrado' });
        return;
      }

      res.json(mapProfileRow(result.rows[0]));
    } catch (e) {
      console.error('[admin/profiles/verify]', e);
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  });

  router.get('/budgets', async (req: Request, res: Response) => {
    try {
      const adminEmail = adminEmailParam();
      const page = parsePage(req.query.page);
      const limit = parseLimit(req.query.limit);
      const offset = (page - 1) * limit;

      const params: unknown[] = [adminEmail];
      const filters: string[] = ['LOWER(u.email) != LOWER($1)'];

      if (typeof req.query.userId === 'string' && req.query.userId.trim()) {
        params.push(req.query.userId.trim());
        filters.push(`b.user_id = $${params.length}`);
      }
      if (typeof req.query.status === 'string' && req.query.status.trim()) {
        params.push(req.query.status.trim());
        filters.push(`b.status = $${params.length}`);
      }
      if (typeof req.query.type === 'string' && req.query.type.trim()) {
        params.push(req.query.type.trim());
        filters.push(`b.type = $${params.length}`);
      }
      if (typeof req.query.from === 'string' && req.query.from.trim()) {
        params.push(req.query.from.trim());
        filters.push(`b.date >= $${params.length}`);
      }
      if (typeof req.query.to === 'string' && req.query.to.trim()) {
        params.push(req.query.to.trim());
        filters.push(`b.date <= $${params.length}`);
      }

      const whereClause = filters.join(' AND ');

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM budgets b
         INNER JOIN users u ON u.id = b.user_id
         WHERE ${whereClause}`,
        params,
      );
      const total = countResult.rows[0].count as number;

      params.push(limit, offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const listResult = await pool.query(
        `SELECT b.*, u.business_name
         FROM budgets b
         INNER JOIN users u ON u.id = b.user_id
         WHERE ${whereClause}
         ORDER BY b.date DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      );

      res.json({
        items: listResult.rows.map((row) => ({
          ...mapBudget(row),
          userId: row.user_id as string,
          businessName: row.business_name as string,
        })),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (e) {
      console.error('[admin/budgets]', e);
      res.status(500).json({ error: 'Erro ao listar orçamentos' });
    }
  });

  return router;
}
