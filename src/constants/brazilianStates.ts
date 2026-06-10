export const BRAZILIAN_UF = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type BrazilianUf = (typeof BRAZILIAN_UF)[number];

export function formatContactLocation(city: string, state: string): string {
  const cityLabel = city.trim() || 'Cidade não informada';
  const stateLabel = state.trim().toUpperCase() || '—';
  if (stateLabel === 'NA') return cityLabel;
  return `${cityLabel} — ${stateLabel}`;
}
