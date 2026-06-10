export const ROUTES = {
  login: '/entrar',
  dashboard: '/',
  costs: '/custos',
  automotive: '/automotivo',
  decorative: '/decorativo',
  orcamento: '/orcamento',
  /** @deprecated use orcamento */
  history: '/orcamento',
  /** @deprecated use catalog */
  settings: '/configuracoes',
  catalog: '/catalogo',
  appliancesBase: '/base-eletros',
  vehiclesBase: '/base-veiculos',
  profile: '/perfil',
  admin: {
    home: '/admin',
    users: '/admin/usuarios',
    userNew: '/admin/usuarios/novo',
    user: (id: string) => `/admin/usuarios/${id}`,
    budgets: '/admin/orcamentos',
    suppliers: '/admin/fornecedores',
    supplierNew: '/admin/fornecedores/novo',
    supplier: (id: string) => `/admin/fornecedores/${id}`,
  },
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
