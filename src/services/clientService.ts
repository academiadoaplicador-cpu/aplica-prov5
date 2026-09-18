import {
  AdminClientListItem,
  ClientCatalog,
  ClientProfile,
  PaginatedResponse,
  PriceEstimate,
  ServiceRequest,
  User,
} from '../types';
import { ClientRegisterPayload } from '../types/auth';

/** O que o assistente envia; o servidor recalcula tudo que define preço. */
export interface ServiceRequestDraft {
  type: 'Automotivo' | 'Decorativo';
  subType?: string;
  materialType: string;
  notes?: string;
  vehicleId?: string;
  scope?: 'completo' | 'parcial';
  partIds?: string[];
  items?: { name?: string; width: number; height: number; quantity?: number; complexity?: number }[];
}

async function api<T>(path: string, options: RequestInit = {}, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
      credentials: 'include',
      signal: controller.signal,
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
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('A operação demorou demais. Verifique sua internet e tente novamente.');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const clientService = {
  register: async (payload: ClientRegisterPayload): Promise<User> => {
    const { user } = await api<{ user: User }>('/auth/client/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return user;
  },

  getProfile: async (): Promise<ClientProfile | null> => {
    return api<ClientProfile | null>('/client/profile');
  },

  updateProfile: async (profile: ClientProfile): Promise<void> => {
    await api('/client/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  getCatalog: async (): Promise<ClientCatalog> => {
    return api<ClientCatalog>('/client/catalog');
  },

  estimate: async (draft: ServiceRequestDraft): Promise<PriceEstimate> => {
    return api<PriceEstimate>('/client/requests/estimate', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  },

  createRequest: async (draft: ServiceRequestDraft): Promise<ServiceRequest> => {
    return api<ServiceRequest>('/client/requests', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  },

  getRequests: async (): Promise<ServiceRequest[]> => {
    return api<ServiceRequest[]>('/client/requests');
  },

  cancelRequest: async (id: string): Promise<void> => {
    await api(`/client/requests/${id}/cancel`, { method: 'POST' });
  },
};

export const adminClientService = {
  list: async (params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<PaginatedResponse<AdminClientListItem>> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.q) query.set('q', params.q);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return api<PaginatedResponse<AdminClientListItem>>(`/admin/clients${qs ? `?${qs}` : ''}`);
  },
};
