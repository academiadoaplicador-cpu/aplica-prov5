import { Material } from '../types';

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const TYPE_KEYS = new Set(['ppf', 'cast', 'calandrado', 'poliester', 'poliéster']);

/** Nome da linha/produto (coluna Linha / Produto na importação). */
export function getMaterialProductLine(material: Material): string {
  const line = material.line?.trim();
  if (line) {
    const lineKey = normalizeKey(line);
    if (!TYPE_KEYS.has(lineKey) && lineKey !== normalizeKey(material.type)) {
      return line;
    }
  }

  const color = material.colorTexture?.trim();
  if (color && color !== '—') {
    const suffix = ` - ${color}`;
    if (material.name.endsWith(suffix)) {
      return material.name.slice(0, -suffix.length);
    }
  }

  return material.name.trim();
}

export function getMaterialColorLabel(material: Material): string {
  const color = material.colorTexture?.trim();
  if (!color || color === '—') return 'Padrão';
  return color;
}

export type MaterialSelectionContext =
  | { mode: 'automotive' }
  | { mode: 'decorative'; subType?: 'Móveis' | 'Eletrodomésticos' | 'Parede' };

export function filterMaterialsByContext(
  materials: Material[],
  context: MaterialSelectionContext,
): Material[] {
  return materials.filter((material) => matchesContext(material, context));
}

function matchesContext(material: Material, context: MaterialSelectionContext): boolean {
  const rec = material.recommendedFor || [];
  if (rec.length === 0) return true;

  if (context.mode === 'automotive') {
    return rec.some(
      (item) =>
        normalizeKey(item).includes('automotivo') || normalizeKey(item).includes('veiculo'),
    );
  }

  if (context.subType) {
    return rec.some((item) => recommendedMatchesSubType(item, context.subType!));
  }

  return rec.some(
    (item) =>
      !normalizeKey(item).includes('automotivo') && !normalizeKey(item).includes('veiculo'),
  );
}

function recommendedMatchesSubType(recommended: string, subType: string): boolean {
  const key = normalizeKey(recommended);
  const subKey = normalizeKey(subType);

  if (key === subKey || key.includes(subKey)) return true;
  if (subType === 'Eletrodomésticos' && (key.includes('geladeira') || key.includes('eletro'))) {
    return true;
  }
  if (subType === 'Móveis' && (key.includes('movel') || key.includes('moveis') || key.includes('porta'))) {
    return true;
  }
  if (subType === 'Parede' && (key.includes('parede') || key.includes('ambiente'))) {
    return true;
  }
  return false;
}

export function getMaterialBrands(materials: Material[]): string[] {
  return Array.from(new Set(materials.map((m) => m.brand).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

export function getMaterialLinesForBrand(materials: Material[], brand: string): string[] {
  return Array.from(
    new Set(
      materials.filter((m) => m.brand === brand).map((m) => getMaterialProductLine(m)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function getMaterialColorsForBrandLine(
  materials: Material[],
  brand: string,
  line: string,
): Material[] {
  return materials
    .filter((m) => m.brand === brand && getMaterialProductLine(m) === line)
    .sort((a, b) => getMaterialColorLabel(a).localeCompare(getMaterialColorLabel(b), 'pt-BR'));
}

export function resolveSelectionFromMaterialId(
  materials: Material[],
  materialId: string,
): { brand: string; line: string } | null {
  const material = materials.find((m) => m.id === materialId);
  if (!material) return null;
  return { brand: material.brand, line: getMaterialProductLine(material) };
}
