import { Material } from '../types';

export function parseWidthValues(raw: unknown): number[] {
  const str = String(raw ?? '').trim();
  if (!str) return [];
  return str
    .split(';')
    .map((part) => parseFloat(part.trim().replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Alias semântico — mesma regra de parsing (valores separados por ;). */
export function parseLengthValues(raw: unknown): number[] {
  return parseWidthValues(raw);
}

function uniqueSortedDesc(values: number[]): number[] {
  return [...new Set(values.map((n) => Number(n.toFixed(4))))].sort((a, b) => b - a);
}

export function parseWidthsFromDetails(details?: string): number[] {
  if (!details) return [];
  const match = details.match(/Larguras dispon[ií]veis:\s*([^•]+)/i);
  if (!match?.[1]) return [];
  return uniqueSortedDesc(
    match[1]
      .split(';')
      .map((part) => parseFloat(part.replace(/[^\d.,]/g, '').replace(',', '.')))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
}

export function parseRollLengthsFromDetails(details?: string): number[] {
  if (!details) return [];
  const match = details.match(/Comprimento do rolo:\s*([^•]+)/i);
  if (!match?.[1]) return [];
  return uniqueSortedDesc(
    match[1]
      .split(';')
      .map((part) => parseFloat(part.replace(/[^\d.,]/g, '').replace(',', '.')))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
}

/** @deprecated use parseRollLengthsFromDetails */
export function parseRollLengthFromDetails(details?: string): number | undefined {
  const lengths = parseRollLengthsFromDetails(details);
  return lengths[0];
}

export function pickRollWidth(widths: number[]): number | undefined {
  if (widths.length === 0) return undefined;
  return Math.max(...widths);
}

export function pickRollLength(lengths: number[]): number | undefined {
  if (lengths.length === 0) return undefined;
  return Math.max(...lengths);
}

export interface MaterialRollOptions {
  widths: number[];
  lengths: number[];
}

export function getMaterialRollOptions(
  material: Pick<Material, 'rollWidthsM' | 'rollLengthsM' | 'rollWidthM' | 'rollLengthM' | 'details'> | undefined,
): MaterialRollOptions {
  if (!material) return { widths: [], lengths: [] };

  const widths = uniqueSortedDesc([
    ...(material.rollWidthsM ?? []),
    ...(material.rollWidthM ? [material.rollWidthM] : []),
    ...parseWidthsFromDetails(material.details),
  ]);

  const lengths = uniqueSortedDesc([
    ...(material.rollLengthsM ?? []),
    ...(material.rollLengthM ? [material.rollLengthM] : []),
    ...parseRollLengthsFromDetails(material.details),
  ]);

  return { widths, lengths };
}

export function getDefaultRollSelection(
  material: Material | undefined,
): { width: number; length: number } | null {
  const { widths, lengths } = getMaterialRollOptions(material);
  if (widths.length === 0 || lengths.length === 0) return null;
  return { width: widths[0], length: lengths[0] };
}

export function resolveMaterialRollDimensions(
  material: Pick<Material, 'rollWidthsM' | 'rollLengthsM' | 'rollWidthM' | 'rollLengthM' | 'details'> | undefined,
  selection?: { width?: number; length?: number },
): { width: number; length: number } | null {
  const { widths, lengths } = getMaterialRollOptions(material);
  if (widths.length === 0 || lengths.length === 0) return null;

  const width =
    selection?.width != null && widths.some((w) => Math.abs(w - selection.width!) < 0.0001)
      ? selection.width
      : widths[0];
  const length =
    selection?.length != null && lengths.some((l) => Math.abs(l - selection.length!) < 0.0001)
      ? selection.length
      : lengths[0];

  return { width, length };
}

export function getMaterialRollDimensions(
  material: Material | undefined,
  selection?: { width?: number; length?: number },
): { width: number; length: number } | null {
  return resolveMaterialRollDimensions(material, selection);
}

export function formatRollOptionList(values: number[]): string {
  if (values.length === 0) return '—';
  return values.map((v) => `${v.toFixed(2).replace('.', ',')} m`).join('; ');
}

/** Preenche arrays e campos simples a partir de details quando necessário. */
export function normalizeMaterialRollFields(material: Material): Material {
  const { widths, lengths } = getMaterialRollOptions(material);
  if (widths.length === 0 && lengths.length === 0) return material;

  return {
    ...material,
    rollWidthsM: material.rollWidthsM?.length ? material.rollWidthsM : widths,
    rollLengthsM: material.rollLengthsM?.length ? material.rollLengthsM : lengths,
    rollWidthM: material.rollWidthM ?? widths[0],
    rollLengthM: material.rollLengthM ?? lengths[0],
  };
}
