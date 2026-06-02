import { Material } from '../types';

export function parseWidthValues(raw: unknown): number[] {
  const str = String(raw ?? '').trim();
  if (!str) return [];
  return str
    .split(';')
    .map((part) => parseFloat(part.trim().replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function parseWidthsFromDetails(details?: string): number[] {
  if (!details) return [];
  const match = details.match(/Larguras dispon[ií]veis:\s*([^•]+)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(';')
    .map((part) => parseFloat(part.replace(/[^\d.,]/g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function parseRollLengthFromDetails(details?: string): number | undefined {
  if (!details) return undefined;
  const match = details.match(/Comprimento do rolo:\s*([\d.,]+)\s*m/i);
  if (!match?.[1]) return undefined;
  const n = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function pickRollWidth(widths: number[]): number | undefined {
  if (widths.length === 0) return undefined;
  return Math.max(...widths);
}

export function resolveMaterialRollDimensions(
  material: Pick<Material, 'rollWidthM' | 'rollLengthM' | 'details'> | undefined,
): { width: number; length: number } | null {
  if (!material) return null;

  const width =
    material.rollWidthM ??
    pickRollWidth(parseWidthsFromDetails(material.details)) ??
    null;
  const length =
    material.rollLengthM ??
    parseRollLengthFromDetails(material.details) ??
    null;

  if (!width || !length || width <= 0 || length <= 0) return null;
  return { width, length };
}

export function getMaterialRollDimensions(
  material: Material | undefined,
): { width: number; length: number } | null {
  return resolveMaterialRollDimensions(material);
}

/** Preenche rollWidthM/rollLengthM a partir de details quando o banco ainda não tem as colunas. */
export function normalizeMaterialRollFields(material: Material): Material {
  const dims = resolveMaterialRollDimensions(material);
  if (!dims) return material;
  return {
    ...material,
    rollWidthM: material.rollWidthM ?? dims.width,
    rollLengthM: material.rollLengthM ?? dims.length,
  };
}
