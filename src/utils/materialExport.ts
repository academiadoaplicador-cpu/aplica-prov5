import * as XLSX from 'xlsx';
import { Material } from '../types';
import { getMaterialRollOptions } from './materialRoll';

/** Cabeçalhos compatíveis com a planilha "Materiais e aplicações" e com a importação. */
export const MATERIAL_EXPORT_HEADERS = [
  'Categoria',
  'Marca',
  'Linha / Produto',
  'Preço Sugerido (R$/m)',
  'Larguras Disponíveis (m)',
  'Comprimento do Rolo (m)',
  'Cores Disponíveis',
  'Recomendado Para',
  'Grau de Dificuldade de Aplicação',
  'Durabilidade',
] as const;

const RECOMMENDED_EXPORT: Record<string, string> = {
  Automotivo: 'Veículo',
  Eletrodomésticos: 'Geladeira',
  Móveis: 'Móveis',
  Parede: 'Parede',
  Sinalização: 'Sinalização',
};

function formatDecimalBr(value: number): string {
  return String(value).replace('.', ',');
}

function formatRollList(values: number[]): string {
  if (values.length === 0) return '';
  return values.map(formatDecimalBr).join('; ');
}

function extractCategory(material: Material): string {
  const details = material.details ?? '';
  const match = details.match(/Categoria:\s*([^•]+)/i);
  if (match?.[1]?.trim()) return match[1].trim();
  return material.type;
}

function exportRecommendedFor(recommended: string[]): string {
  const mapped = recommended.map((item) => RECOMMENDED_EXPORT[item] ?? item);
  return [...new Set(mapped)].join(';');
}

function exportDurability(durability: string): string {
  const trimmed = durability.trim();
  if (!trimmed || trimmed.toLowerCase() === 'consultar fabricante') return '';
  return trimmed;
}

function groupKey(material: Material): string {
  const roll = getMaterialRollOptions(material);
  return [
    material.brand,
    material.line,
    material.type,
    material.pricePerM2,
    roll.widths.join(','),
    roll.lengths.join(','),
    material.durability,
    material.applicationDifficulty ?? '',
    [...material.recommendedFor].sort().join('|'),
    extractCategory(material),
  ].join('::');
}

function collectColors(group: Material[]): string {
  const colors = group
    .map((m) => m.colorTexture.trim())
    .filter((c) => c && c !== '—');
  return [...new Set(colors)].join('; ');
}

export function materialsToExportRows(materials: Material[]): unknown[][] {
  const groups = new Map<string, Material[]>();

  for (const material of materials) {
    const key = groupKey(material);
    const list = groups.get(key);
    if (list) list.push(material);
    else groups.set(key, [material]);
  }

  const rows = Array.from(groups.values())
    .map((group) => {
      const sample = group[0];
      const roll = getMaterialRollOptions(sample);
      return [
        extractCategory(sample),
        sample.brand,
        sample.line,
        sample.pricePerM2,
        formatRollList(roll.widths),
        formatRollList(roll.lengths),
        collectColors(group),
        exportRecommendedFor(sample.recommendedFor),
        sample.applicationDifficulty ?? '',
        exportDurability(sample.durability),
      ];
    })
    .sort((a, b) => {
      const brandCmp = String(a[1]).localeCompare(String(b[1]), 'pt-BR');
      if (brandCmp !== 0) return brandCmp;
      return String(a[2]).localeCompare(String(b[2]), 'pt-BR');
    });

  return rows;
}

export function downloadMaterialsCatalog(materials: Material[], filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const rows = [MATERIAL_EXPORT_HEADERS, ...materialsToExportRows(materials)];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [22, 18, 24, 18, 22, 22, 28, 22, 28, 18].map((wch) => ({ wch }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Materiais');
  XLSX.writeFile(workbook, filename ?? `catalogo-materiais-aplica-pro-${date}.xlsx`);
}
