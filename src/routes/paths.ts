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
  guiaTecnico: '/guia-tecnico',
  regionRequests: '/pedidos-regiao',
  profile: '/perfil',
  client: {
    login: '/cliente/entrar',
    home: '/cliente',
    orders: '/cliente/pedidos',
    newRequest: '/cliente/pedidos/novo',
    profile: '/cliente/perfil',
  },
  admin: {
    home: '/admin',
    users: '/admin/usuarios',
    userNew: '/admin/usuarios/novo',
    user: (id: string) => `/admin/usuarios/${id}`,
    budgets: '/admin/orcamentos',
    suppliers: '/admin/fornecedores',
    supplierNew: '/admin/fornecedores/novo',
    supplier: (id: string) => `/admin/fornecedores/${id}`,
    promotions: '/admin/promocoes',
    promotionNew: '/admin/promocoes/novo',
    promotion: (id: string) => `/admin/promocoes/${id}`,
    clients: '/admin/clientes',
    pricing: '/admin/tabela-preco',
    requests: '/admin/pedidos',
  },
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
