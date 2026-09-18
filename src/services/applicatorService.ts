import {
  ApplicatorAvailability,
  ApplicatorSummary,
  RegionRequestsResponse,
  ServiceRequest,
} from '../types';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/applicator${path}`, {
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
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      /* texto puro */
    }
    throw new Error(message || `Erro na API (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const applicatorService = {
  getSummary: (): Promise<ApplicatorSummary> => api<ApplicatorSummary>('/summary'),

  getAvailability: (): Promise<ApplicatorAvailability> =>
    api<ApplicatorAvailability>('/availability'),

  setAvailability: (isAvailable: boolean): Promise<{ isAvailable: boolean }> =>
    api<{ isAvailable: boolean }>('/availability', {
      method: 'PUT',
      body: JSON.stringify({ isAvailable }),
    }),

  getRegionRequests: (): Promise<RegionRequestsResponse> =>
    api<RegionRequestsResponse>('/requests'),

  acceptRequest: (id: string): Promise<{ ok: true; budgetId: string }> =>
    api<{ ok: true; budgetId: string }>(`/requests/${id}/accept`, { method: 'POST' }),

  getAcceptedRequests: (): Promise<ServiceRequest[]> =>
    api<ServiceRequest[]>('/requests/accepted'),
};
