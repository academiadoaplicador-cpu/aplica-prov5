import {
  ApplicatorProfile,
  Budget,
  FinancialSettings,
  Material,
  User,
  Vehicle,
  Appliance,
} from '../types';
import { RegisterPayload } from '../types/auth';
import { normalizeMaterialRollFields } from '../utils/materialRoll';

const USER_CACHE_KEY = 'aplica_pro_user_cache';

function getCachedUser(): User | null {
  try {
    const data = sessionStorage.getItem(USER_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: User | null) {
  if (user) {
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(USER_CACHE_KEY);
  }
}

function parseApiError(status: number, text: string): string {
  let message = text.trim();

  if (message.startsWith('<!DOCTYPE') || message.startsWith('<html')) {
    const preMatch = message.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (preMatch?.[1]) message = preMatch[1].trim();
    if (status === 404) {
      return 'Recurso não encontrado na API. Verifique se o servidor está atualizado e reinicie-o.';
    }
    return message || `Erro no servidor (${status}). Tente novamente.`;
  }

  try {
    const parsed = JSON.parse(text) as { error?: string };
    message = parsed.error ?? text;
  } catch {
    /* texto puro */
  }
  if (status === 413) {
    return 'Os dados enviados são grandes demais. Use uma foto menor e tente novamente.';
  }
  if (status === 429) {
    return message || 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }
  return message || `Erro na API (${status})`;
}

async function api<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 60_000,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseApiError(res.status, text));
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return text ? JSON.parse(text) : (undefined as T);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        'A operação demorou demais. Verifique sua internet e tente novamente.',
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const databaseService = {
  getUser: async (): Promise<User | null> => {
    try {
      const { user } = await api<{ user: User }>('/auth/me');
      setCachedUser(user);
      return user;
    } catch {
      setCachedUser(null);
      return null;
    }
  },

  getCachedUser,

  login: async (email: string, password: string): Promise<User> => {
    const { user } = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCachedUser(user);
    return user;
  },

  register: async (payload: RegisterPayload): Promise<User> => {
    const { user } = await api<{ user: User }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      120_000,
    );
    setCachedUser(user);
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setCachedUser(null);
    }
  },

  getFinancialSettings: async (): Promise<FinancialSettings> => {
    return api<FinancialSettings>('/financial-settings');
  },

  setFinancialSettings: async (settings: FinancialSettings): Promise<void> => {
    await api('/financial-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getMaterials: async (): Promise<Material[]> => {
    const materials = await api<Material[]>('/materials');
    return materials.map(normalizeMaterialRollFields);
  },

  setMaterials: async (materials: Material[]): Promise<void> => {
    await api('/materials', {
      method: 'PUT',
      body: JSON.stringify({ materials }),
    });
  },

  importMaterials: async (materials: Material[]): Promise<Material[]> => {
    const imported = await api<Material[]>('/materials/import', {
      method: 'POST',
      body: JSON.stringify({ materials }),
    });
    return imported.map(normalizeMaterialRollFields);
  },

  getBudgets: async (): Promise<Budget[]> => {
    return api<Budget[]>('/budgets');
  },

  saveBudget: async (budget: Budget): Promise<void> => {
    await api('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  },

  deleteBudget: async (id: string): Promise<void> => {
    await api(`/budgets/${id}`, { method: 'DELETE' });
  },

  getProfile: async (userId: string): Promise<ApplicatorProfile | null> => {
    void userId;
    return api<ApplicatorProfile | null>('/profile');
  },

  setProfile: async (userId: string, profile: ApplicatorProfile): Promise<void> => {
    void userId;
    await api('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  getVehicles: async (): Promise<Vehicle[]> => {
    return api<Vehicle[]>('/vehicles');
  },

  setVehicles: async (vehicles: Vehicle[]): Promise<void> => {
    await api('/vehicles', {
      method: 'PUT',
      body: JSON.stringify({ vehicles }),
    });
  },

  importVehicles: async (vehicles: Vehicle[]): Promise<Vehicle[]> => {
    return api<Vehicle[]>('/vehicles/import', {
      method: 'POST',
      body: JSON.stringify({ vehicles }),
    });
  },

  getAppliances: async (): Promise<Appliance[]> => {
    return api<Appliance[]>('/appliances');
  },

  setAppliances: async (appliances: Appliance[]): Promise<void> => {
    await api('/appliances', {
      method: 'PUT',
      body: JSON.stringify({ appliances }),
    });
  },

  importAppliances: async (appliances: Appliance[]): Promise<Appliance[]> => {
    return api<Appliance[]>('/appliances/import', {
      method: 'POST',
      body: JSON.stringify({ appliances }),
    });
  },
};
