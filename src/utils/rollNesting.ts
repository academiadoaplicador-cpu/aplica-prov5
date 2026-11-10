export interface NestingPartInput {
  id: string;
  name: string;
  width: number;
  length: number;
  /** ID da peça no catálogo (ex.: CAP), quando o `id` ganhou prefixo de item ou cópia. */
  baseId?: string;
}

export interface PlacedPart {
  id: string;
  name: string;
  /** Posição na largura do rolo (m). */
  x: number;
  /** Posição no comprimento, contada do início do próprio rolo (m). */
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  originalWidth: number;
  originalLength: number;
  /** Rolo físico onde a peça foi cortada (0 = primeiro rolo). */
  rollIndex: number;
  /** ID da peça original quando esta faixa veio de um corte. */
  sourceId?: string;
  baseId?: string;
  splitIndex?: number;
  splitCount?: number;
}

interface PackablePiece {
  id: string;
  name: string;
  width: number;
  length: number;
  rotated: boolean;
  originalWidth: number;
  originalLength: number;
  sourceId: string;
  baseId?: string;
  splitIndex?: number;
  splitCount?: number;
}

export interface UnplacedPart {
  id: string;
  name: string;
  width: number;
  length: number;
  reason: string;
}

/** Um rolo físico do plano e quanto dele foi usado. */
export interface RollUsage {
  /** 0 = primeiro rolo. */
  index: number;
  /** Comprimento consumido neste rolo (m), nunca maior que o rolo. */
  usedLength: number;
  /** O que sobra deste rolo depois dos cortes (m). */
  leftoverLength: number;
}

export interface RollNestingResult {
  rollWidth: number;
  /** Comprimento físico de cada rolo (m). */
  rollLength: number;
  placed: PlacedPart[];
  unplaced: UnplacedPart[];
  /** Rolos usados, em ordem. Vazio quando nenhuma peça foi posicionada. */
  rolls: RollUsage[];
  /** Soma do comprimento consumido em todos os rolos (m). */
  usedLength: number;
  allFit: boolean;
}

const EPS = 0.0001;

/** Em quantos pedaços iguais a dimensão precisa ser dividida para caber no limite. */
function splitCount(total: number, max: number): number {
  return total <= max + EPS ? 1 : Math.ceil(total / max - EPS);
}

/**
 * Coloca a peça no rolo. Se ela não couber inteira, divide em pedaços iguais:
 * faixas quando passa da largura do rolo, emendas quando passa do comprimento.
 * Entre a posição original e a girada, fica a que gera menos pedaços (empate:
 * posição original). Nenhum pedaço passa das medidas do rolo.
 */
function expandPartForRoll(
  part: NestingPartInput,
  rollWidth: number,
  rollLength: number,
): PackablePiece[] {
  const layouts = [
    { across: part.width, along: part.length, rotated: false },
    { across: part.length, along: part.width, rotated: true },
  ].map((layout) => {
    const acrossCount = splitCount(layout.across, rollWidth);
    const alongCount = splitCount(layout.along, rollLength);
    return { ...layout, acrossCount, alongCount, total: acrossCount * alongCount };
  });
  const best = layouts[1].total < layouts[0].total ? layouts[1] : layouts[0];

  const width = best.across / best.acrossCount;
  const length = best.along / best.alongCount;
  const count = best.total;
  return Array.from({ length: count }, (_, index) => ({
    id: count > 1 ? `${part.id}::${index}` : part.id,
    name: count > 1 ? `${part.name} (${index + 1}/${count})` : part.name,
    width,
    length,
    rotated: best.rotated,
    originalWidth: part.width,
    originalLength: part.length,
    sourceId: part.id,
    baseId: part.baseId,
    splitIndex: count > 1 ? index + 1 : undefined,
    splitCount: count > 1 ? count : undefined,
  }));
}

/**
 * Preenche um único rolo com prateleiras (faixas ao longo do comprimento).
 * Peças que não cabem no que resta deste rolo voltam para o próximo.
 */
function packSingleRoll(
  pieces: PackablePiece[],
  rollWidth: number,
  rollLength: number,
  rollIndex: number,
): { placed: PlacedPart[]; deferred: PackablePiece[] } {
  const placed: PlacedPart[] = [];
  const deferred: PackablePiece[] = [];
  let shelfY = 0;
  let shelfHeight = 0;
  let cursorX = 0;

  for (const piece of pieces) {
    const fitsCurrentShelf =
      cursorX + piece.width <= rollWidth + EPS && shelfY + piece.length <= rollLength + EPS;

    if (!fitsCurrentShelf) {
      const fitsNewShelf = shelfY + shelfHeight + piece.length <= rollLength + EPS;
      if (!fitsNewShelf) {
        deferred.push(piece);
        continue;
      }
      shelfY += shelfHeight;
      shelfHeight = 0;
      cursorX = 0;
    }

    placed.push({
      id: piece.id,
      name: piece.name,
      x: cursorX,
      y: shelfY,
      width: piece.width,
      height: piece.length,
      rotated: piece.rotated,
      originalWidth: piece.originalWidth,
      originalLength: piece.originalLength,
      rollIndex,
      sourceId: piece.sourceId,
      baseId: piece.baseId,
      splitIndex: piece.splitIndex,
      splitCount: piece.splitCount,
    });
    cursorX += piece.width;
    shelfHeight = Math.max(shelfHeight, piece.length);
  }

  return { placed, deferred };
}

/**
 * Encaixa as peças em rolos de medida fixa. Nenhuma peça passa do fim do rolo:
 * quando um rolo enche, abre-se outro, até todas as peças estarem cortadas.
 * Peças maiores que o rolo são divididas em faixas/emendas antes do encaixe.
 */
export function packPartsIntoRolls(
  parts: NestingPartInput[],
  rollWidth: number,
  rollLength: number,
): RollNestingResult {
  const unplaced: UnplacedPart[] = [];
  const pieces: PackablePiece[] = [];
  const validRoll = rollWidth > EPS && rollLength > EPS;

  for (const part of parts) {
    if (validRoll && part.width > EPS && part.length > EPS) {
      pieces.push(...expandPartForRoll(part, rollWidth, rollLength));
    } else {
      unplaced.push({
        id: part.id,
        name: part.name,
        width: part.width,
        length: part.length,
        reason: validRoll ? 'Peça sem medida.' : 'Rolo sem medida cadastrada.',
      });
    }
  }

  let remaining = [...pieces].sort(
    (a, b) => Math.max(b.width, b.length) - Math.max(a.width, a.length),
  );
  const placed: PlacedPart[] = [];
  const rolls: RollUsage[] = [];

  while (remaining.length > 0) {
    const rollIndex = rolls.length;
    const result = packSingleRoll(remaining, rollWidth, rollLength, rollIndex);
    // Toda peça restante cabe num rolo vazio; a guarda só evita laço infinito.
    if (result.placed.length === 0) break;
    const usedLength = Math.min(
      rollLength,
      Math.max(...result.placed.map((part) => part.y + part.height)),
    );
    placed.push(...result.placed);
    rolls.push({ index: rollIndex, usedLength, leftoverLength: Math.max(0, rollLength - usedLength) });
    remaining = result.deferred;
  }

  return {
    rollWidth,
    rollLength,
    placed,
    unplaced,
    rolls,
    usedLength: rolls.reduce((sum, roll) => sum + roll.usedLength, 0),
    allFit: unplaced.length === 0 && remaining.length === 0 && parts.length > 0,
  };
}

/**
 * Repete as peças de um veículo pela quantidade da frota (+1, +2, …), para
 * encaixar todas as cópias juntas nos rolos.
 */
export function repeatPartsForFleet(
  parts: NestingPartInput[],
  vehicleQuantity: number,
): NestingPartInput[] {
  const qty = Math.max(1, Math.floor(vehicleQuantity));
  if (qty <= 1) return parts;
  return Array.from({ length: qty }, (_, copy) =>
    parts.map((part) => ({
      ...part,
      id: `${part.id}::c${copy}`,
      name: `${part.name} (+${copy + 1})`,
      baseId: part.baseId ?? part.id,
    })),
  ).flat();
}

/** Margem para cortes, sobreposição e perdas na aplicação. */
export const ROLL_WASTE_FACTOR = 1.15;

export interface RollMaterialUsage {
  /** Comprimento consumido somando todos os rolos (m). */
  usedLength: number;
  usedLengthPerVehicle?: number;
  rollWidth: number;
  rollAreaM2: number;
  materialM2: number;
  vehicleQuantity?: number;
  /** Rolos físicos usados (≥ 1). */
  rollsNeeded: number;
  nesting: RollNestingResult;
}

export interface ComputeRollMaterialUsageOptions {
  wasteFactor?: number;
  vehicleQuantity?: number;
}

/** Soma da área real das peças posicionadas no rolo (m²). */
export function placedPartsAreaM2(placed: PlacedPart[]): number {
  return placed.reduce((sum, part) => sum + part.width * part.height, 0);
}

/**
 * Área faturável = soma das peças efetivamente cortadas, em todos os rolos
 * necessários, × 1,15. Numa frota, todas as cópias são encaixadas juntas.
 */
export function computeRollMaterialUsage(
  parts: NestingPartInput[],
  rollWidth: number,
  rollLength: number,
  wasteFactorOrOptions: number | ComputeRollMaterialUsageOptions = ROLL_WASTE_FACTOR,
): RollMaterialUsage {
  let wasteFactor = ROLL_WASTE_FACTOR;
  let vehicleQuantity = 1;

  if (typeof wasteFactorOrOptions === 'number') {
    wasteFactor = wasteFactorOrOptions;
  } else {
    wasteFactor = wasteFactorOrOptions.wasteFactor ?? ROLL_WASTE_FACTOR;
    vehicleQuantity = Math.max(1, Math.floor(wasteFactorOrOptions.vehicleQuantity ?? 1));
  }

  const nesting = packPartsIntoRolls(repeatPartsForFleet(parts, vehicleQuantity), rollWidth, rollLength);
  const rollAreaM2 = placedPartsAreaM2(nesting.placed);

  return {
    usedLength: nesting.usedLength,
    usedLengthPerVehicle: vehicleQuantity > 1 ? nesting.usedLength / vehicleQuantity : undefined,
    rollWidth,
    rollAreaM2,
    materialM2: rollAreaM2 * wasteFactor,
    vehicleQuantity: vehicleQuantity > 1 ? vehicleQuantity : undefined,
    rollsNeeded: Math.max(1, nesting.rolls.length),
    nesting,
  };
}

/** m² cobrados: área das peças usadas + margem de perda. */
export function billableMaterialM2(
  placedAreaM2: number,
  wasteFactor = ROLL_WASTE_FACTOR,
): number {
  if (placedAreaM2 <= 0) return 0;
  return placedAreaM2 * wasteFactor;
}
