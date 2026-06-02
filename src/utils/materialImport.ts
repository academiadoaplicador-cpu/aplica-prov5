import * as XLSX from 'xlsx';
import { Material, MaterialType } from '../types';
import { generateId } from '../lib/utils';
import { pickRollWidth, parseWidthValues } from './materialRoll';

export interface MaterialImportResult {
  materials: Material[];
  skipped: number;
  errors: string[];
}

const INVALID_CELL_PATTERN = /:contentReference|oaicite:\d+|index=\d+/i;

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Remove lixo de células exportadas do Copilot/Word (ex.: :contentReference[oaicite:2]{index=2}) */
export function sanitizeCellText(value: unknown): string {
  const str = String(value ?? '').trim();
  if (!str || INVALID_CELL_PATTERN.test(str)) return '';
  return str;
}

function resolveProductName(category: string, brand: string, product: string, color: string): string {
  const cleanProduct = sanitizeCellText(product);
  if (cleanProduct) return cleanProduct;
  if (category && color) return `${category} - ${color}`;
  if (category) return category;
  if (brand && color) return `${brand} - ${color}`;
  return brand || 'Material importado';
}

function getCell(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const exact = entries.find(([key]) => normalizeKey(key) === target);
    if (exact) return exact[1];
  }
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const partial = entries.find(([key]) => {
      const keyNorm = normalizeKey(key);
      return keyNorm.includes(target) || target.includes(keyNorm);
    });
    if (partial) return partial[1];
  }
  return undefined;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Valores separados por ponto e vírgula (ex.: 1,37; 1,52 ou Veículo;Geladeira) */
export function splitSemicolonValues(value: unknown): string[] {
  const str = String(value ?? '').trim();
  if (!str) return [];
  return str
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

function expandColorVariants(colorsRaw: string): string[] {
  const trimmed = colorsRaw.trim();
  if (!trimmed) return [''];

  const bySemicolon = splitSemicolonValues(trimmed);
  if (bySemicolon.length > 1) return bySemicolon;

  if (trimmed.includes(',')) {
    const byComma = trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (byComma.length > 1 && byComma.every((part) => part.length <= 45)) {
      return byComma;
    }
  }

  return [trimmed];
}

function mapCategoryToType(category: string): MaterialType {
  const key = normalizeKey(category);
  if (key.includes('ppf') || key.includes('protecao de pintura')) return 'PPF';
  if (key.includes('calandrado')) return 'Calandrado';
  if (key.includes('polimerico') || key.includes('poliester') || key.includes('poliéster')) {
    return 'Poliéster';
  }
  return 'Cast';
}

const RECOMMENDED_ALIASES: Record<string, string> = {
  veiculo: 'Automotivo',
  'veiculo (detalhes)': 'Automotivo',
  'veiculo (farois)': 'Automotivo',
  geladeira: 'Eletrodomésticos',
  parede: 'Parede',
  moveis: 'Móveis',
  portas: 'Móveis',
  sinalizacao: 'Sinalização',
  'comunicacao visual': 'Sinalização',
  decoracao: 'Móveis',
  ambientes: 'Parede',
  'passagens de alto trafego': 'Sinalização',
  projetos: 'Sinalização',
  'matte glass': 'Automotivo',
  vidro: 'Automotivo',
};

function mapRecommended(value: string): string {
  const key = normalizeKey(value);
  if (RECOMMENDED_ALIASES[key]) return RECOMMENDED_ALIASES[key];
  if (key.includes('veiculo')) return 'Automotivo';
  if (key.includes('geladeira') || key.includes('eletro')) return 'Eletrodomésticos';
  if (key.includes('parede')) return 'Parede';
  if (key.includes('movel') || key.includes('moveis')) return 'Móveis';
  if (key.includes('sinaliz') || key.includes('comunicacao')) return 'Sinalização';
  return value.trim();
}

export function materialKey(material: Pick<Material, 'brand' | 'name'>): string {
  return `${normalizeKey(material.brand)}|${normalizeKey(material.name)}`;
}

function parseRow(
  row: Record<string, unknown>,
  rowIndex: number,
): { materials: Material[]; warnings: string[] } {
  const category = sanitizeCellText(getCell(row, 'categoria', 'category'));
  const brand = sanitizeCellText(getCell(row, 'marca', 'brand', 'fabricante'));
  const productRaw = String(
    getCell(row, 'linha / produto', 'linha', 'produto', 'line', 'linha produto') ?? '',
  ).trim();
  const colorsRaw = sanitizeCellText(
    getCell(row, 'cores disponiveis', 'cores disponíveis', 'cores', 'cor'),
  );
  const product = resolveProductName(category, brand, productRaw, colorsRaw);
  const warnings: string[] = [];

  if (productRaw && !sanitizeCellText(productRaw)) {
    warnings.push(
      `Linha ${rowIndex}: nome do produto inválido na planilha — usado "${product}" como alternativa.`,
    );
  }

  const price = parseNumber(
    getCell(
      row,
      'preco sugerido (r$/m)',
      'preço sugerido (r$/m)',
      'preco sugerido',
      'preço sugerido',
      'preco',
      'preço',
      'price',
    ),
  );
  const widths = parseWidthValues(
    getCell(
      row,
      'larguras disponiveis (m)',
      'larguras disponíveis (m)',
      'larguras',
      'largura',
    ),
  );
  const rollLengthM = parseNumber(
    getCell(
      row,
      'comprimento do rolo (m)',
      'comprimento do rolo',
      'comprimento rolo',
    ),
  );
  const rollWidthM = pickRollWidth(widths);
  const recommendedParts = splitSemicolonValues(
    getCell(row, 'recomendado para', 'recomendado', 'recomendado para'),
  );
  const difficulty = parseNumber(
    getCell(
      row,
      'grau de dificuldade de aplicacao',
      'grau de dificuldade de aplicação',
      'dificuldade',
      'grau de dificuldade',
      'grau',
    ),
  );

  if (!brand || !product) return { materials: [], warnings };
  if (price === null) {
    throw new Error(`Linha ${rowIndex}: preço inválido para ${brand} ${product}.`);
  }

  const recommendedFor = [
    ...new Set(recommendedParts.map(mapRecommended).filter((item) => item.length > 0)),
  ];

  const type = mapCategoryToType(category);
  const colorVariants = expandColorVariants(colorsRaw);

  const detailParts: string[] = [];
  if (widths.length > 0) {
    detailParts.push(`Larguras disponíveis: ${widths.map((w) => `${w} m`).join('; ')}`);
  }
  if (rollLengthM !== null) {
    detailParts.push(`Comprimento do rolo: ${rollLengthM} m`);
  }
  if (difficulty !== null) {
    detailParts.push(`Grau de dificuldade de aplicação: ${String(difficulty).replace('.', ',')}`);
  }
  if (category) {
    detailParts.push(`Categoria: ${category}`);
  }
  const details = detailParts.join(' • ');

  const materials = colorVariants.map((color) => {
    const name =
      colorVariants.length > 1 && color ? `${product} - ${color}` : product;

    return {
      id: generateId(),
      name,
      brand,
      pricePerM2: price,
      type,
      line: product,
      colorTexture: color || colorsRaw || '—',
      durability: difficulty !== null ? `Dificuldade ${difficulty}` : 'Consultar fabricante',
      recommendedFor: recommendedFor.length > 0 ? recommendedFor : ['Automotivo'],
      details: details || undefined,
      rollWidthM,
      rollLengthM: rollLengthM ?? undefined,
    };
  });

  return { materials, warnings };
}

export function parseMaterialsFromExcel(buffer: ArrayBuffer): MaterialImportResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { materials: [], skipped: 0, errors: ['Planilha vazia ou sem abas.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const materials: Material[] = [];
  const errors: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const rowIndex = index + 2;
    try {
      const { materials: parsed, warnings } = parseRow(row, rowIndex);
      if (parsed.length === 0) {
        skipped += 1;
        return;
      }
      materials.push(...parsed);
      errors.push(...warnings);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Linha ${rowIndex}: erro ao ler registro.`);
    }
  });

  return { materials, skipped, errors };
}

export function mergeMaterials(existing: Material[], imported: Material[]): {
  merged: Material[];
  added: number;
  updated: number;
} {
  const byKey = new Map<string, Material>();
  for (const material of existing) {
    byKey.set(materialKey(material), material);
  }

  let added = 0;
  let updated = 0;

  for (const material of imported) {
    const key = materialKey(material);
    const current = byKey.get(key);
    if (current) {
      byKey.set(key, {
        ...current,
        brand: material.brand,
        name: material.name,
        pricePerM2: material.pricePerM2,
        type: material.type,
        line: material.line,
        colorTexture: material.colorTexture,
        durability: material.durability,
        recommendedFor: material.recommendedFor,
        details: material.details,
        rollWidthM: material.rollWidthM,
        rollLengthM: material.rollLengthM,
      });
      updated += 1;
    } else {
      byKey.set(key, material);
      added += 1;
    }
  }

  return {
    merged: Array.from(byKey.values()).sort((a, b) =>
      a.brand.localeCompare(b.brand, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'),
    ),
    added,
    updated,
  };
}
