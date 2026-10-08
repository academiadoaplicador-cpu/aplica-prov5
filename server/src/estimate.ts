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

/** Tipos que o cliente pode pedir; Poliéster fica fora da tela do cliente por enquanto. */
export const CLIENT_MATERIAL_TYPES: readonly string[] = ['Cast', 'Calandrado', 'PPF'];

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

export interface CatalogPriceStats {
  productCount: number;
  minPerM2: number;
  medianPerM2: number;
  maxPerM2: number;
}

/** Preço/m² dos produtos válidos (preço > 0) do catálogo global para o tipo escolhido. */
export async function catalogPriceStats(
  db: Pool | PoolClient,
  materialType: string,
): Promise<CatalogPriceStats> {
  const catalogUserId = await resolveCatalogUserId(db);
  const result = await db.query<{
    count: number;
    min: string | null;
    median: string | null;
    max: string | null;
  }>(
    `SELECT COUNT(*)::int AS count,
            MIN(price_per_m2) AS min,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_m2) AS median,
            MAX(price_per_m2) AS max
     FROM materials
     WHERE user_id = $1 AND type = $2 AND price_per_m2 > 0`,
    [catalogUserId, materialType],
  );
  const row = result.rows[0];
  const num = (v: string | null | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    productCount: row?.count ?? 0,
    minPerM2: num(row?.min),
    medianPerM2: num(row?.median),
    maxPerM2: num(row?.max),
  };
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
  /** Cliente fornece o material: só a mão de obra entra na conta. */
  laborOnly?: boolean;
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
  productCount: number;
  minPricePerM2: number;
  maxPricePerM2: number;
  laborOnly: boolean;
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

function finalPrice(
  scope: { m2: number; hours: number },
  pricePerM2: number,
  pricing: PlatformPricing,
): number {
  const baseCost = scope.m2 * pricePerM2 + scope.hours * pricing.hourlyRate;
  return (
    baseCost *
    (1 + pricing.profitMarginPercentage / 100) *
    (1 + pricing.taxPercentage / 100)
  );
}

/** A faixa vai do produto mais barato ao mais caro do tipo; a mediana fica como referência. */
export function priceFromScope(
  scope: { m2: number; hours: number },
  stats: CatalogPriceStats,
  pricing: PlatformPricing,
): EstimateResult {
  return {
    estimatedM2: round2(scope.m2),
    estimatedHours: round2(scope.hours),
    referencePricePerM2: round2(stats.medianPerM2),
    suggestedPrice: round2(finalPrice(scope, stats.medianPerM2, pricing)),
    priceMin: round2(finalPrice(scope, stats.minPerM2, pricing)),
    priceMax: round2(finalPrice(scope, stats.maxPerM2, pricing)),
    productCount: stats.productCount,
    minPricePerM2: round2(stats.minPerM2),
    maxPricePerM2: round2(stats.maxPerM2),
    laborOnly: false,
  };
}

/** Só aplicação: sem material, a faixa usa os percentuais da tabela da plataforma. */
export function laborOnlyFromScope(
  scope: { m2: number; hours: number },
  pricing: PlatformPricing,
): EstimateResult {
  const suggested = finalPrice(scope, 0, pricing);
  return {
    estimatedM2: round2(scope.m2),
    estimatedHours: round2(scope.hours),
    referencePricePerM2: 0,
    suggestedPrice: round2(suggested),
    priceMin: round2(suggested * (1 - pricing.rangeBelowPercentage / 100)),
    priceMax: round2(suggested * (1 + pricing.rangeAbovePercentage / 100)),
    productCount: 0,
    minPricePerM2: 0,
    maxPricePerM2: 0,
    laborOnly: true,
  };
}

/** Sem preço de referência não dá para estimar uma cotação completa. */
export function isEstimateAvailable(estimate: EstimateResult): boolean {
  return estimate.laborOnly || estimate.referencePricePerM2 > 0;
}

export async function buildEstimate(
  db: Pool | PoolClient,
  input: EstimateInput,
): Promise<EstimateResult> {
  if (input.laborOnly) {
    return laborOnlyFromScope(measureScope(input), await fetchPlatformPricing(db));
  }
  const [pricing, stats] = await Promise.all([
    fetchPlatformPricing(db),
    catalogPriceStats(db, input.materialType),
  ]);
  return priceFromScope(measureScope(input), stats, pricing);
}

/** Peças de um envelopamento completo para o porte informado. */
export function fullWrapPartIds(vehicleSize: string): string[] {
  return VEHICLE_PRESETS[vehicleSize] ?? VEHICLE_PRESETS['Médio (Sedan/SUV Compacto)'];
}

export function describeParts(partIds: string[]): string {
  return partIds.map(partName).join(', ');
}
