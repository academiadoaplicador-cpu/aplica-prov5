import { Router, type Request, type Response } from 'express';
import type { Pool, PoolClient } from 'pg';
import {
  acceptServiceRequest,
  fetchRegionRequests,
  mapServiceRequest,
  sweepExpiredRequests,
} from './serviceRequests.js';

/** Rotas de marketplace do lado da oficina: mural da região e disponibilidade. */
export function createApplicatorRouter(pool: Pool): Router {
  const router = Router();

  router.get('/availability', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT is_available, availability_changed_at, verified_documents, city, state_code
         FROM applicator_profiles WHERE user_id = $1`,
        [req.userId],
      );
      if (result.rows.length === 0) {
        res.json({ isAvailable: false, verifiedDocuments: false });
        return;
      }
      const row = result.rows[0];
      res.json({
        isAvailable: row.is_available !== false,
        verifiedDocuments: Boolean(row.verified_documents),
        city: (row.city as string) || '',
        stateCode: (row.state_code as string) || '',
        changedAt: row.availability_changed_at
          ? new Date(row.availability_changed_at as string | Date).toISOString()
          : undefined,
      });
    } catch (e) {
      console.error('[availability:get]', e);
      res.status(500).json({ error: 'Erro ao carregar sua disponibilidade' });
    }
  });

  router.put('/availability', async (req: Request, res: Response) => {
    const isAvailable = (req.body || {}).isAvailable;
    if (typeof isAvailable !== 'boolean') {
      res.status(400).json({ error: 'Informe se você está disponível' });
      return;
    }
    try {
      const result = await pool.query(
        `UPDATE applicator_profiles
         SET is_available = $1, availability_changed_at = NOW()
         WHERE user_id = $2
         RETURNING is_available`,
        [isAvailable, req.userId],
      );
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Perfil não encontrado' });
        return;
      }
      res.json({ isAvailable: result.rows[0].is_available !== false });
    } catch (e) {
      console.error('[availability:put]', e);
      res.status(500).json({ error: 'Erro ao salvar sua disponibilidade' });
    }
  });

  /**
   * Resumo leve para o cabeçalho/menu: disponibilidade + quantos pedidos abertos
   * existem na região. Serve de "notificação" sem precisar abrir o mural.
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const profile = await pool.query(
        `SELECT p.city, p.state_code, p.verified_documents, p.is_available,
                COALESCE(u.is_active, TRUE) AS is_active
         FROM applicator_profiles p
         INNER JOIN users u ON u.id = p.user_id
         WHERE p.user_id = $1`,
        [req.userId],
      );

      if (profile.rows.length === 0) {
        res.json({ isAvailable: false, verifiedDocuments: false, openRequestCount: 0 });
        return;
      }

      const row = profile.rows[0];
      const eligible =
        Boolean(row.verified_documents) &&
        row.is_available !== false &&
        row.is_active !== false &&
        Boolean(row.city) &&
        Boolean(row.state_code);

      let openRequestCount = 0;
      if (eligible) {
        await sweepExpiredRequests(pool);
        const count = await pool.query(
          `SELECT COUNT(*)::int AS count FROM service_requests
           WHERE status = 'Aguardando aceite'
             AND LOWER(city) = LOWER($1)
             AND UPPER(state_code) = UPPER($2)`,
          [row.city, row.state_code],
        );
        openRequestCount = count.rows[0].count as number;
      }

      res.json({
        isAvailable: row.is_available !== false,
        verifiedDocuments: Boolean(row.verified_documents),
        city: (row.city as string) || '',
        stateCode: (row.state_code as string) || '',
        openRequestCount,
      });
    } catch (e) {
      console.error('[applicator/summary]', e);
      res.status(500).json({ error: 'Erro ao carregar o resumo' });
    }
  });

  /** Mural: pedidos abertos da cidade do aplicador. */
  router.get('/requests', async (req: Request, res: Response) => {
    try {
      const result = await fetchRegionRequests(pool, req.userId!);
      res.json(result);
    } catch (e) {
      console.error('[requests:get]', e);
      res.status(500).json({ error: 'Erro ao carregar os pedidos da sua região' });
    }
  });

  router.post('/requests/:id/accept', async (req: Request, res: Response) => {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const result = await acceptServiceRequest(client, req.params.id, req.userId!);
      if (result.ok === false) {
        await client.query('ROLLBACK');
        const { status, error } = result;
        res.status(status).json({ error });
        return;
      }

      await client.query('COMMIT');
      res.json({ ok: true, budgetId: result.budgetId });
    } catch (e) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* transação já encerrada */
        }
      }
      console.error('[requests:accept]', e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao aceitar o pedido' });
      }
    } finally {
      client?.release();
    }
  });

  /** Pedidos que este aplicador já aceitou, com o contato do cliente. */
  router.get('/requests/accepted', async (req: Request, res: Response) => {
    try {
      await sweepExpiredRequests(pool);
      const result = await pool.query(
        `SELECT r.*, c.full_name AS client_name, c.phone AS client_phone,
                c.neighborhood AS client_neighborhood
         FROM service_requests r
         LEFT JOIN client_profiles c ON c.user_id = r.client_id
         WHERE r.accepted_by = $1
         ORDER BY r.accepted_at DESC
         LIMIT 100`,
        [req.userId],
      );
      res.json(
        result.rows.map((r) => ({
          ...mapServiceRequest(r),
          client: {
            name: (r.client_name as string) || 'Cliente',
            phone: (r.client_phone as string) || '',
            neighborhood: (r.client_neighborhood as string) || '',
          },
        })),
      );
    } catch (e) {
      console.error('[requests/accepted]', e);
      res.status(500).json({ error: 'Erro ao carregar seus pedidos aceitos' });
    }
  });

  return router;
}
