import {
  CnpjLookupResult,
  PaginatedResponse,
  Supplier,
  SupplierAccount,
  SupplierChangeRequest,
  SupplierImportResult,
  SupplierInput,
  SupplierListItem,
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

export const supplierService = {
  getSuppliers: (params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<PaginatedResponse<SupplierListItem>> =>
    adminApi<PaginatedResponse<SupplierListItem>>(
      `/suppliers${buildQuery(params)}`,
    ),

  getSupplier: (id: string): Promise<Supplier> =>
    adminApi<Supplier>(`/suppliers/${encodeURIComponent(id)}`),

  createSupplier: (payload: SupplierInput): Promise<Supplier> =>
    adminApi<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSupplier: (id: string, payload: SupplierInput): Promise<Supplier> =>
    adminApi<Supplier>(`/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  setSupplierActive: (id: string, isActive: boolean): Promise<SupplierListItem> =>
    adminApi<SupplierListItem>(`/suppliers/${encodeURIComponent(id)}/active`, {
      method: 'POST',
      body: JSON.stringify({ isActive }),
    }),

  deleteSupplier: (id: string): Promise<void> =>
    adminApi<void>(`/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  importSuppliers: (suppliers: SupplierInput[]): Promise<SupplierImportResult> =>
    adminApi<SupplierImportResult>('/suppliers/import', {
      method: 'POST',
      body: JSON.stringify({ suppliers }),
    }),

  getSupplierAccount: (id: string): Promise<{ account: SupplierAccount | null }> =>
    adminApi<{ account: SupplierAccount | null }>(`/suppliers/${encodeURIComponent(id)}/account`),

  createSupplierAccount: (
    id: string,
    payload: { email: string; password: string },
  ): Promise<{ account: SupplierAccount }> =>
    adminApi<{ account: SupplierAccount }>(`/suppliers/${encodeURIComponent(id)}/account`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetSupplierPassword: (id: string, password: string): Promise<{ account: SupplierAccount }> =>
    adminApi<{ account: SupplierAccount }>(
      `/suppliers/${encodeURIComponent(id)}/account/password`,
      { method: 'POST', body: JSON.stringify({ password }) },
    ),

  removeSupplierAccount: (id: string): Promise<void> =>
    adminApi<void>(`/suppliers/${encodeURIComponent(id)}/account`, { method: 'DELETE' }),

  getChangeRequests: (id: string): Promise<SupplierChangeRequest[]> =>
    adminApi<SupplierChangeRequest[]>(`/suppliers/${encodeURIComponent(id)}/change-requests`),

  approveChangeRequest: (id: string, requestId: string): Promise<Supplier> =>
    adminApi<Supplier>(
      `/suppliers/${encodeURIComponent(id)}/change-requests/${encodeURIComponent(requestId)}/approve`,
      { method: 'POST' },
    ),

  rejectChangeRequest: (id: string, requestId: string, note: string): Promise<void> =>
    adminApi<void>(
      `/suppliers/${encodeURIComponent(id)}/change-requests/${encodeURIComponent(requestId)}/reject`,
      { method: 'POST', body: JSON.stringify({ note }) },
    ),

  lookupCnpj: (cnpj: string): Promise<CnpjLookupResult> =>
    adminApi<CnpjLookupResult>('/suppliers/cnpj-lookup', {
      method: 'POST',
      body: JSON.stringify({ cnpj: cnpj.replace(/\D/g, '') }),
    }),

  lookupSupplier: async (brand: string, line: string): Promise<Supplier | null> => {
    const params = new URLSearchParams({ brand, line });
    const res = await fetch(`/api/suppliers/lookup?${params}`, {
      credentials: 'include',
    });
    if (res.status === 404) return null;
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
    return res.json() as Promise<Supplier>;
  },
};
