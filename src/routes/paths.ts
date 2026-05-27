export const ROUTES = {
  login: '/entrar',
  dashboard: '/',
  costs: '/custos',
  automotive: '/automotivo',
  decorative: '/decorativo',
  history: '/historico',
  /** @deprecated use catalog */
  settings: '/configuracoes',
  catalog: '/catalogo',
  appliancesBase: '/base-eletros',
  vehiclesBase: '/base-veiculos',
  profile: '/perfil',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
