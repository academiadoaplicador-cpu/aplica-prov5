import { Material, SupplierContactInput, SupplierOwnProfile } from '../types';

/** Área do fornecedor logado. O servidor resolve o cadastro pela sessão. */
async function supplierApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/supplier${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    credentials: 'include',
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      /* texto puro */
    }
    throw new Error(message || `Erro na API (${res.status})`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const supplierPortalService = {
  getProfile: () => supplierApi<SupplierOwnProfile>('/profile'),

  /** Vale na hora: nome fantasia, e-mail, endereço e contatos WhatsApp. */
  updateProfile: (payload: {
    tradeName?: string;
    email?: string;
    address?: string;
    contacts: SupplierContactInput[];
  }) =>
    supplierApi<SupplierOwnProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /** Marcas/linhas do catálogo no formato que os seletores de material usam. */
  getCatalogLines: async (): Promise<Material[]> => {
    const rows = await supplierApi<{ brand: string; line: string; type: string }[]>('/catalog-lines');
    return rows.map((row, index) => ({ id: `line-${index}`, ...row }) as unknown as Material);
  },

  /** Razão social, CNPJ e marcas/linhas: só valem depois da aprovação do admin. */
  requestChange: (payload: {
    legalName?: string;
    cnpj?: string;
    productLinks?: { brand: string; line: string }[];
  }) =>
    supplierApi<SupplierOwnProfile>('/change-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelChangeRequest: () =>
    supplierApi<SupplierOwnProfile>('/change-request', { method: 'DELETE' }),
};
