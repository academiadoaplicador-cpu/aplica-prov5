import { Router, type Request, type Response } from 'express';
import type { Pool, PoolClient } from 'pg';
import {
  buildClientPhoneStored,
  clientProfileDbParams,
  CLIENT_PROFILE_UPSERT_SQL,
  mapClientProfileRow,
  type ClientProfileInput,
} from './clientProfileData.js';
import { resolveCatalogUserId } from './catalog.js';
import { buildEstimate, MATERIAL_TYPES } from './estimate.js';
import {
  createServiceRequest,
  mapServiceRequest,
  resolveScope,
  sweepExpiredRequests,
  REQUEST_EXPIRY_HOURS,
  type CreateRequestInput,
} from './serviceRequests.js';

export function createClientRouter(pool: Pool): Router {
  const router = Router();

  router.get('/profile', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM client_profiles WHERE user_id = $1', [
        req.userId,
      ]);
      if (result.rows.length === 0) {
        res.json(null);
        return;
      }
      res.json(mapClientProfileRow(result.rows[0]));
    } catch (e) {
      console.error('[client/profile:get]', e);
      res.status(500).json({ error: 'Erro ao carregar seus dados' });
    }
  });

  router.put('/profile', async (req: Request, res: Response) => {
    const body = (req.body || {}) as ClientProfileInput;

    const fullName = body.fullName?.trim() || '';
    if (!fullName) {
      res.status(400).json({ error: 'Informe seu nome completo' });
      return;
    }
    if (fullName.length > 120) {
      res.status(400).json({ error: 'Nome muito longo' });
      return;
    }
    if (!buildClientPhoneStored(body)) {
      res.status(400).json({ error: 'Informe um telefone para contato' });
      return;
    }
    const cepDigits = (body.cep || '').replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      res.status(400).json({ error: 'Informe um CEP válido (8 dígitos)' });
      return;
    }
    if (!body.city?.trim() || !body.stateCode?.trim()) {
      res.status(400).json({ error: 'Cidade e UF são obrigatórios' });
      return;
    }

    try {
      await pool.query(CLIENT_PROFILE_UPSERT_SQL, [req.userId, ...clientProfileDbParams(body)]);
      // O nome do cliente é o rótulo da conta — mantém users em sincronia.
      await pool.query('UPDATE users SET business_name = $1 WHERE id = $2', [
        fullName,
        req.userId,
      ]);
      res.json({ ok: true });
    } catch (e) {
      console.error('[client/profile:put]', e);
      res.status(500).json({ error: 'Erro ao salvar seus dados' });
    }
  });

  /** Catálogo enxuto para o assistente — o cliente não acessa /api/vehicles. */
  router.get('/catalog', async (_req: Request, res: Response) => {
    try {
      const catalogUserId = await resolveCatalogUserId(pool);
      const [vehicles, finishes] = await Promise.all([
        pool.query(
          `SELECT id, make, model, year, size, part_measurements
           FROM vehicles WHERE user_id = $1
           ORDER BY make, model, year`,
          [catalogUserId],
        ),
        pool.query(
          `SELECT type, COUNT(*)::int AS count,
                  percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_m2) AS median
           FROM materials
           WHERE user_id = $1 AND price_per_m2 > 0
           GROUP BY type`,
          [catalogUserId],
        ),
      ]);

      const medians = new Map(
        finishes.rows.map((r) => [r.type as string, Number(r.median)]),
      );

      res.json({
        vehicles: vehicles.rows.map((v) => ({
          id: v.id as string,
          make: v.make as string,
          model: v.model as string,
          year: v.year as string,
          size: v.size as string,
          parts: Object.entries(
            (v.part_measurements as Record<string, { width: number; length: number }>) || {},
          ).map(([id, m]) => ({ id, width: Number(m.width), length: Number(m.length) })),
        })),
        // Só oferece acabamento que tem preço de referência no catálogo global.
        materialTypes: MATERIAL_TYPES.filter((t) => (medians.get(t) ?? 0) > 0),
        expiryHours: REQUEST_EXPIRY_HOURS,
      });
    } catch (e) {
      console.error('[client/catalog]', e);
      res.status(500).json({ error: 'Erro ao carregar o catálogo' });
    }
  });

  /** Prévia da faixa enquanto o cliente mexe no assistente. Não grava nada. */
  router.post('/requests/estimate', async (req: Request, res: Response) => {
    try {
      const scope = await resolveScope(pool, (req.body || {}) as CreateRequestInput);
      if (scope.ok === false) {
        const { status, error } = scope;
        res.status(status).json({ error });
        return;
      }
      const estimate = await buildEstimate(pool, scope.estimateInput);
      if (estimate.referencePricePerM2 <= 0) {
        res.status(409).json({
          error: 'Não há preço de referência para este acabamento. Tente outro.',
        });
        return;
      }
      res.json({ ...estimate, scopeLabel: scope.scopeLabel });
    } catch (e) {
      console.error('[client/requests/estimate]', e);
      res.status(500).json({ error: 'Erro ao calcular a estimativa' });
    }
  });

  router.post('/requests', async (req: Request, res: Response) => {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const result = await createServiceRequest(
        client,
        req.userId!,
        (req.body || {}) as CreateRequestInput,
      );

      if (result.ok === false) {
        await client.query('ROLLBACK');
        const { status, error } = result;
        res.status(status).json({ error });
        return;
      }

      await client.query('COMMIT');

      const created = await pool.query('SELECT * FROM service_requests WHERE id = $1', [
        result.id,
      ]);
      res.status(201).json(mapServiceRequest(created.rows[0]));
    } catch (e) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* transação já encerrada */
        }
      }
      console.error('[client/requests:post]', e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao enviar o pedido' });
      }
    } finally {
      client?.release();
    }
  });

  router.get('/requests', async (req: Request, res: Response) => {
    try {
      await sweepExpiredRequests(pool);
      const result = await pool.query(
        `SELECT r.*, p.full_name AS applicator_name, u.business_name AS applicator_business,
                p.phone AS applicator_phone, p.city AS applicator_city
         FROM service_requests r
         LEFT JOIN users u ON u.id = r.accepted_by
         LEFT JOIN applicator_profiles p ON p.user_id = r.accepted_by
         WHERE r.client_id = $1
         ORDER BY r.created_at DESC
         LIMIT 100`,
        [req.userId],
      );
      res.json(
        result.rows.map((r) => ({
          ...mapServiceRequest(r),
          applicator: r.accepted_by
            ? {
                name: (r.applicator_name as string) || (r.applicator_business as string) || '',
                businessName: (r.applicator_business as string) || '',
                phone: (r.applicator_phone as string) || '',
                city: (r.applicator_city as string) || '',
              }
            : undefined,
        })),
      );
    } catch (e) {
      console.error('[client/requests:get]', e);
      res.status(500).json({ error: 'Erro ao carregar seus pedidos' });
    }
  });

  router.post('/requests/:id/cancel', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `UPDATE service_requests
         SET status = 'Cancelado', updated_at = NOW()
         WHERE id = $1 AND client_id = $2 AND status = 'Aguardando aceite'
         RETURNING id`,
        [req.params.id, req.userId],
      );
      if (result.rowCount === 0) {
        res.status(409).json({
          error: 'Este pedido não pode mais ser cancelado.',
        });
        return;
      }
      res.json({ ok: true });
    } catch (e) {
      console.error('[client/requests:cancel]', e);
      res.status(500).json({ error: 'Erro ao cancelar o pedido' });
    }
  });

  return router;
}
