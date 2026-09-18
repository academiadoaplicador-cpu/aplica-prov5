import type { Pool, PoolClient } from 'pg';
import { resolveCatalogUserId } from './catalog.js';
import { partDifficulty, partName, VEHICLE_PRESETS } from './vehicleParts.js';

/** Horas por ponto de dificuldade — mesma constante do AutomotiveCalculator. */
const HOURS_PER_DIFFICULTY_POINT = 0.75;

/** Multiplicador de mão de obra por complexidade — mesmo do DecorativeCalculator. */
const DECORATIVE_COMPLEXITY_MULTIPLIER: Record<number, number> = {
  1: 1.5,
  2: 2.5,
  3: 4,
};

export const MATERIAL_TYPES = ['Cast', 'Calandrado', 'PPF', 'Poliéster'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export interface PlatformPricing {
  hourlyRate: number;
  profitMarginPercentage: number;
  taxPercentage: number;
  rangeBelowPercentage: number;
  rangeAbovePercentage: number;
  updatedAt?: string;
}

export function mapPlatformPricing(row: Record<string, unknown>): PlatformPricing {
  return {
    hourlyRate: Number(row.hourly_rate),
    profitMarginPercentage: Number(row.profit_margin_percentage),
    taxPercentage: Number(row.tax_percentage),
    rangeBelowPercentage: Number(row.range_below_percentage),
    rangeAbovePercentage: Number(row.range_above_percentage),
    updatedAt: row.updated_at
      ? new Date(row.updated_at as string | Date).toISOString()
      : undefined,
  };
}

export async function fetchPlatformPricing(db: Pool | PoolClient): Promise<PlatformPricing> {
  const result = await db.query(`SELECT * FROM platform_pricing WHERE id = 'default'`);
  if (result.rows.length === 0) {
    // A migration semeia a linha; se sumir, o padrão do schema evita derrubar o pedido.
    return {
      hourlyRate: 50,
      profitMarginPercentage: 30,
      taxPercentage: 6,
      rangeBelowPercentage: 15,
      rangeAbovePercentage: 25,
    };
  }
  return mapPlatformPricing(result.rows[0]);
}

/**
 * Preço de referência de um acabamento: a mediana do catálogo global daquele tipo.
 * Mediana e não média porque alguns SKUs de importado distorcem a ponta de cima.
 */
export async function referencePricePerM2(
  db: Pool | PoolClient,
  materialType: string,
): Promise<number> {
  const catalogUserId = await resolveCatalogUserId(db);
  const result = await db.query<{ median: string | null }>(
    `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_m2) AS median
     FROM materials
     WHERE user_id = $1 AND type = $2 AND price_per_m2 > 0`,
    [catalogUserId, materialType],
  );
  const median = Number(result.rows[0]?.median);
  return Number.isFinite(median) && median > 0 ? median : 0;
}

export interface DecorativeItemInput {
  name?: string;
  width: number;
  height: number;
  quantity?: number;
  complexity?: number;
}

export interface EstimateInput {
  type: 'Automotivo' | 'Decorativo';
  materialType: string;
  /** Automotivo */
  partIds?: string[];
  partMeasurements?: Record<string, { width: number; length: number }>;
  /** Decorativo */
  items?: DecorativeItemInput[];
}

export interface EstimateResult {
  estimatedM2: number;
  estimatedHours: number;
  referencePricePerM2: number;
  suggestedPrice: number;
  priceMin: number;
  priceMax: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Área e horas do escopo pedido. Reproduz as fórmulas dos calculadores da oficina,
 * porém sobre a área geométrica: o aproveitamento de rolo depende do material
 * exato, que o cliente não escolhe. A folga fica embutida na ponta de cima da faixa.
 */
export function measureScope(input: EstimateInput): { m2: number; hours: number } {
  if (input.type === 'Automotivo') {
    const measurements = input.partMeasurements || {};
    let m2 = 0;
    let difficulty = 0;
    for (const partId of input.partIds || []) {
      const measure = measurements[partId];
      if (measure) {
        m2 += Number(measure.width) * Number(measure.length);
      }
      difficulty += partDifficulty(partId);
    }
    return { m2, hours: difficulty * HOURS_PER_DIFFICULTY_POINT };
  }

  let m2 = 0;
  let hours = 0;
  for (const item of input.items || []) {
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const area = Number(item.width) * Number(item.height) * quantity;
    if (!Number.isFinite(area) || area <= 0) continue;
    const complexity = Math.min(3, Math.max(1, Math.floor(Number(item.complexity) || 1)));
    m2 += area;
    hours += area * (DECORATIVE_COMPLEXITY_MULTIPLIER[complexity] ?? 1.5);
  }
  return { m2, hours };
}

export function priceFromScope(
  scope: { m2: number; hours: number },
  pricePerM2: number,
  pricing: PlatformPricing,
): EstimateResult {
  const materialCost = scope.m2 * pricePerM2;
  const laborCost = scope.hours * pricing.hourlyRate;
  const baseCost = materialCost + laborCost;

  const suggestedPrice =
    baseCost *
    (1 + pricing.profitMarginPercentage / 100) *
    (1 + pricing.taxPercentage / 100);

  return {
    estimatedM2: round2(scope.m2),
    estimatedHours: round2(scope.hours),
    referencePricePerM2: round2(pricePerM2),
    suggestedPrice: round2(suggestedPrice),
    priceMin: round2(suggestedPrice * (1 - pricing.rangeBelowPercentage / 100)),
    priceMax: round2(suggestedPrice * (1 + pricing.rangeAbovePercentage / 100)),
  };
}

export async function buildEstimate(
  db: Pool | PoolClient,
  input: EstimateInput,
): Promise<EstimateResult> {
  const [pricing, pricePerM2] = await Promise.all([
    fetchPlatformPricing(db),
    referencePricePerM2(db, input.materialType),
  ]);
  return priceFromScope(measureScope(input), pricePerM2, pricing);
}

/** Peças de um envelopamento completo para o porte informado. */
export function fullWrapPartIds(vehicleSize: string): string[] {
  return VEHICLE_PRESETS[vehicleSize] ?? VEHICLE_PRESETS['Médio (Sedan/SUV Compacto)'];
}

export function describeParts(partIds: string[]): string {
  return partIds.map(partName).join(', ');
}
