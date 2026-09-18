/**
 * Espelho de src/types/vehicleParts.ts. A estimativa do cliente é calculada no
 * servidor (o navegador não pode definir o próprio preço), então a dificuldade
 * de cada peça e os presets de envelopamento completo precisam existir aqui.
 * Mantenha os dois lados em sincronia — mesmo padrão de password.ts e email.ts.
 */

export const VEHICLE_PART_DIFFICULTY: Record<string, 1 | 2 | 3> = {
  CAP: 2,
  TET: 2,
  MAL: 2,
  PCD: 3,
  PCE: 3,
  PTD: 3,
  PTE: 3,
  PDD: 2,
  PDE: 2,
  PTD_DOOR: 2,
  PTE_DOOR: 2,
  PCD_BUMP: 3,
  PCT_BUMP: 3,
  SAI_D: 1,
  SAI_E: 1,
  RET_D: 3,
  RET_E: 3,
  MAC_D: 2,
  AER: 3,
  COL: 1,
  GRA: 3,
};

export const VEHICLE_PART_NAMES: Record<string, string> = {
  CAP: 'Capô',
  TET: 'Teto',
  MAL: 'Porta-Malas',
  PCD: 'Paralama Dianteiro Dir.',
  PCE: 'Paralama Dianteiro Esq.',
  PTD: 'Paralama Traseiro Dir.',
  PTE: 'Paralama Traseiro Esq.',
  PDD: 'Porta Dianteira Dir.',
  PDE: 'Porta Dianteira Esq.',
  PTD_DOOR: 'Porta Traseira Dir.',
  PTE_DOOR: 'Porta Traseira Esq.',
  PCD_BUMP: 'Parachoque Dianteiro',
  PCT_BUMP: 'Parachoque Traseiro',
  SAI_D: 'Saia Lateral Dir.',
  SAI_E: 'Saia Lateral Esq.',
  RET_D: 'Retrovisor Dir.',
  RET_E: 'Retrovisor Esq.',
  MAC_D: 'Maçanetas (Kit)',
  AER: 'Aerofólio',
  COL: 'Colunas',
  GRA: 'Grade/Detalhes',
};

/** Peças de um envelopamento completo, por porte do veículo. */
export const VEHICLE_PRESETS: Record<string, string[]> = {
  'Pequeno (Hatch/Compacto)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E', 'SAI_D', 'SAI_E',
  ],
  'Médio (Sedan/SUV Compacto)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E',
    'SAI_D', 'SAI_E', 'COL',
  ],
  'Grande (SUV/Pickup)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E',
    'SAI_D', 'SAI_E', 'COL', 'AER', 'MAC_D',
  ],
  'Extra Grande (Van/Caminhão)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E',
    'SAI_D', 'SAI_E', 'COL', 'AER', 'MAC_D', 'GRA',
  ],
};

export function partDifficulty(partId: string): number {
  return VEHICLE_PART_DIFFICULTY[partId] ?? 2;
}

export function partName(partId: string): string {
  return VEHICLE_PART_NAMES[partId] ?? partId;
}
