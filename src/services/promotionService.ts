import { Promotion, PromotionInput } from '../types';

async function adminApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    if (text.trimStart().startsWith('<!DOCTYPE') || text.includes('Cannot GET')) {
      message =
        'Rota da API não encontrada. Reinicie o servidor da API (docker restart aplica-pro-api).';
    } else {
      try {
        const parsed = JSON.parse(text) as { error?: string };
        message = parsed.error ?? text;
      } catch {
        /* texto puro */
      }
    }
    throw new Error(message || `Erro na API (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const promotionService = {
  getPromotions: (): Promise<Promotion[]> => adminApi<Promotion[]>('/promotions'),

  getPromotion: (id: string): Promise<Promotion> =>
    adminApi<Promotion>(`/promotions/${encodeURIComponent(id)}`),

  createPromotion: (payload: PromotionInput): Promise<Promotion> =>
    adminApi<Promotion>('/promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePromotion: (id: string, payload: PromotionInput): Promise<Promotion> =>
    adminApi<Promotion>(`/promotions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  setPromotionActive: (id: string, isActive: boolean): Promise<Promotion> =>
    adminApi<Promotion>(`/promotions/${encodeURIComponent(id)}/active`, {
      method: 'POST',
      body: JSON.stringify({ isActive }),
    }),

  deletePromotion: (id: string): Promise<void> =>
    adminApi<void>(`/promotions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
