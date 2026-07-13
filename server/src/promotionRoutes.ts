import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';

export interface PromotionInput {
  title: string;
  description?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  bannerDesktopUrl: string;
  bannerMobileUrl: string;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}

const MAX_PROMOTION_BANNER_LENGTH = 350_000;

function newPromotionId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function mapPromotion(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    ctaLabel: (row.cta_label as string) || undefined,
    ctaUrl: (row.cta_url as string) || undefined,
    bannerDesktopUrl: row.banner_desktop_url as string,
    bannerMobileUrl: row.banner_mobile_url as string,
    startsAt: row.starts_at ? new Date(row.starts_at as string | Date).toISOString() : undefined,
    endsAt: row.ends_at ? new Date(row.ends_at as string | Date).toISOString() : undefined,
    isActive: row.is_active !== false,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  };
}

function validatePromotionInput(body: PromotionInput): string | null {
  const title = String(body.title ?? '').trim();
  if (!title) return 'Título é obrigatório';

  const bannerDesktopUrl = String(body.bannerDesktopUrl ?? '').trim();
  const bannerMobileUrl = String(body.bannerMobileUrl ?? '').trim();
  if (!bannerDesktopUrl) return 'Banner para desktop é obrigatório';
  if (!bannerMobileUrl) return 'Banner para celular é obrigatório';
  if (bannerDesktopUrl.length > MAX_PROMOTION_BANNER_LENGTH) return 'Banner para desktop muito grande';
  if (bannerMobileUrl.length > MAX_PROMOTION_BANNER_LENGTH) return 'Banner para celular muito grande';

  const ctaUrl = body.ctaUrl ? String(body.ctaUrl).trim() : '';
  if (ctaUrl) {
    try {
      new URL(ctaUrl);
    } catch {
      return 'Link do botão inválido';
    }
  }

  if (body.startsAt && body.endsAt) {
    const start = new Date(body.startsAt);
    const end = new Date(body.endsAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      return 'Data de término deve ser depois da data de início';
    }
  }

  return null;
}

export function createPromotionAdminRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM promotions ORDER BY updated_at DESC');
      res.json(result.rows.map((row) => mapPromotion(row as Record<string, unknown>)));
    } catch (e) {
      console.error('[admin/promotions]', e);
      res.status(500).json({ error: 'Erro ao listar promoções' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Promoção não encontrada' });
        return;
      }
      res.json(mapPromotion(result.rows[0] as Record<string, unknown>));
    } catch (e) {
      console.error('[admin/promotions/:id]', e);
      res.status(500).json({ error: 'Erro ao carregar promoção' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const body = req.body as PromotionInput;
    const validationError = validatePromotionInput(body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    try {
      const id = newPromotionId();
      const result = await pool.query(
        `INSERT INTO promotions (
           id, title, description, cta_label, cta_url,
           banner_desktop_url, banner_mobile_url, starts_at, ends_at, is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          body.title.trim(),
          body.description?.trim() || null,
          body.ctaLabel?.trim() || null,
          body.ctaUrl?.trim() || null,
          body.bannerDesktopUrl,
          body.bannerMobileUrl,
          body.startsAt || null,
          body.endsAt || null,
          body.isActive !== false,
        ],
      );
      res.status(201).json(mapPromotion(result.rows[0] as Record<string, unknown>));
    } catch (e) {
      console.error('[admin/promotions POST]', e);
      res.status(500).json({ error: 'Erro ao criar promoção' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const body = req.body as PromotionInput;
    const validationError = validatePromotionInput(body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    try {
      const result = await pool.query(
        `UPDATE promotions
         SET title = $1, description = $2, cta_label = $3, cta_url = $4,
             banner_desktop_url = $5, banner_mobile_url = $6, starts_at = $7, ends_at = $8,
             is_active = $9, updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [
          body.title.trim(),
          body.description?.trim() || null,
          body.ctaLabel?.trim() || null,
          body.ctaUrl?.trim() || null,
          body.bannerDesktopUrl,
          body.bannerMobileUrl,
          body.startsAt || null,
          body.endsAt || null,
          body.isActive !== false,
          req.params.id,
        ],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Promoção não encontrada' });
        return;
      }
      res.json(mapPromotion(result.rows[0] as Record<string, unknown>));
    } catch (e) {
      console.error('[admin/promotions PUT]', e);
      res.status(500).json({ error: 'Erro ao atualizar promoção' });
    }
  });

  router.post('/:id/active', async (req: Request, res: Response) => {
    try {
      const isActive = Boolean((req.body as { isActive?: boolean }).isActive);
      const result = await pool.query(
        `UPDATE promotions SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [isActive, req.params.id],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Promoção não encontrada' });
        return;
      }
      res.json(mapPromotion(result.rows[0] as Record<string, unknown>));
    } catch (e) {
      console.error('[admin/promotions active]', e);
      res.status(500).json({ error: 'Erro ao alterar status' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('DELETE FROM promotions WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Promoção não encontrada' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('[admin/promotions DELETE]', e);
      res.status(500).json({ error: 'Erro ao excluir promoção' });
    }
  });

  return router;
}

export async function fetchActivePromotionForToday(pool: Pool) {
  const result = await pool.query(
    `SELECT * FROM promotions
     WHERE is_active = TRUE
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (ends_at IS NULL OR ends_at >= NOW())
     ORDER BY updated_at DESC
     LIMIT 1`,
  );
  return result.rows.length > 0 ? mapPromotion(result.rows[0] as Record<string, unknown>) : null;
}
