import {
  AdminBudgetListItem,
  AdminCreateUserPayload,
  AdminStats,
  AdminUpdateUserPayload,
  AdminUserDetail,
  AdminUserListItem,
  ApplicatorProfile,
  PaginatedResponse,
} from '../types';

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
    try {
      const parsed = JSON.parse(text) as { error?: string };
      message = parsed.error ?? text;
    } catch {
      /* texto puro */
    }
    throw new Error(message || `Erro na API (${res.status})`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const q = search.toString();
  return q ? `?${q}` : '';
}

export const adminService = {
  getStats: (): Promise<AdminStats> => adminApi<AdminStats>('/stats'),

  getUsers: (params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<PaginatedResponse<AdminUserListItem>> =>
    adminApi<PaginatedResponse<AdminUserListItem>>(
      `/users${buildQuery(params)}`,
    ),

  getUser: (id: string): Promise<AdminUserDetail> =>
    adminApi<AdminUserDetail>(`/users/${encodeURIComponent(id)}`),

  createUser: (payload: AdminCreateUserPayload) =>
    adminApi<{ id: string; email: string; businessName: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (id: string, payload: AdminUpdateUserPayload) =>
    adminApi<AdminUserListItem>(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  setUserActive: (id: string, isActive: boolean) =>
    adminApi<AdminUserListItem>(`/users/${encodeURIComponent(id)}/active`, {
      method: 'POST',
      body: JSON.stringify({ isActive }),
    }),

  deleteUser: (id: string, confirmBusinessName: string) =>
    adminApi<{ ok: boolean }>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmBusinessName }),
    }),

  patchProfileVerify: (
    userId: string,
    body: { verifiedDocuments?: boolean; rating?: number },
  ): Promise<ApplicatorProfile> =>
    adminApi<ApplicatorProfile>(`/profiles/${encodeURIComponent(userId)}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getBudgets: (params: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: string;
    type?: string;
    from?: string;
    to?: string;
  }): Promise<PaginatedResponse<AdminBudgetListItem>> =>
    adminApi<PaginatedResponse<AdminBudgetListItem>>(
      `/budgets${buildQuery(params)}`,
    ),
};
