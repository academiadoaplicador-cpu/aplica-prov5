export interface NestingPartInput {
  id: string;
  name: string;
  width: number;
  length: number;
}

export interface PlacedPart {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  originalWidth: number;
  originalLength: number;
  /** ID da peça original quando esta faixa veio de um corte. */
  sourceId?: string;
  splitIndex?: number;
  splitCount?: number;
  /** Índice da cópia do veículo no plano repetido (+1, +2, …). */
  vehicleCopyIndex?: number;
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

export interface RollNestingResult {
  rollWidth: number;
  rollLength: number;
  placed: PlacedPart[];
  unplaced: UnplacedPart[];
  usedLength: number;
  allFit: boolean;
}

function bestOrientation(
  partWidth: number,
  partLength: number,
  rollWidth: number,
): { width: number; length: number; rotated: boolean } | null {
  if (partWidth <= rollWidth) {
    return { width: partWidth, length: partLength, rotated: false };
  }
  if (partLength <= rollWidth) {
    return { width: partLength, length: partWidth, rotated: true };
  }
  return null;
}

/** Divide uma dimensão em faixas iguais que cabem na largura do rolo. */
function splitDimensionIntoStrips(total: number, maxWidth: number): number[] {
  if (total <= maxWidth + 0.0001) return [total];
  const count = Math.ceil(total / maxWidth);
  const segmentSize = total / count;
  return Array.from({ length: count }, () => segmentSize);
}

function makeStrips(
  dimToSplit: number,
  fixedDim: number,
  rollWidth: number,
  rotated: boolean,
  part: NestingPartInput,
): PackablePiece[] {
  const strips = splitDimensionIntoStrips(dimToSplit, rollWidth);
  const count = strips.length;
  return strips.map((stripWidth, index) => ({
    id: count > 1 ? `${part.id}::${index}` : part.id,
    name: count > 1 ? `${part.name} (${index + 1}/${count})` : part.name,
    width: stripWidth,
    length: fixedDim,
    rotated,
    originalWidth: part.width,
    originalLength: part.length,
    sourceId: part.id,
    splitIndex: count > 1 ? index + 1 : undefined,
    splitCount: count > 1 ? count : undefined,
  }));
}

/** Orienta a peça no rolo; se não couber inteira, divide em faixas na largura do rolo. */
function expandPartForRoll(part: NestingPartInput, rollWidth: number): PackablePiece[] {
  const oriented = bestOrientation(part.width, part.length, rollWidth);
  if (oriented) {
    return [
      {
        id: part.id,
        name: part.name,
        width: oriented.width,
        length: oriented.length,
        rotated: oriented.rotated,
        originalWidth: part.width,
        originalLength: part.length,
        sourceId: part.id,
      },
    ];
  }

  const splitAlongWidth = makeStrips(part.width, part.length, rollWidth, false, part);
  const splitAlongLength = makeStrips(part.length, part.width, rollWidth, true, part);
  return splitAlongWidth.length <= splitAlongLength.length ? splitAlongWidth : splitAlongLength;
}

function rollbackSource(placed: PlacedPart[], sourceId: string): PlacedPart[] {
  return placed.filter((piece) => (piece.sourceId ?? piece.id) !== sourceId);
}

/** Empacota peças no rolo (largura × comprimento) com algoritmo de prateleiras. */
export function packPartsOnRoll(
  parts: NestingPartInput[],
  rollWidth: number,
  rollLength: number,
): RollNestingResult {
  let placed: PlacedPart[] = [];
  const unplaced: UnplacedPart[] = [];
  const unplacedSourceIds = new Set<string>();

  const expanded = parts.flatMap((part) => expandPartForRoll(part, rollWidth));
  const sorted = [...expanded].sort(
    (a, b) => Math.max(b.width, b.length) - Math.max(a.width, a.length),
  );

  let shelfY = 0;
  let shelfHeight = 0;
  let cursorX = 0;

  const markSourceUnplaced = (piece: PackablePiece, reason: string) => {
    if (unplacedSourceIds.has(piece.sourceId)) return;
    unplacedSourceIds.add(piece.sourceId);
    placed = rollbackSource(placed, piece.sourceId);
    const original = parts.find((part) => part.id === piece.sourceId);
    unplaced.push({
      id: piece.sourceId,
      name: original?.name ?? piece.name,
      width: piece.originalWidth,
      length: piece.originalLength,
      reason,
    });
  };

  for (const piece of sorted) {
    if (unplacedSourceIds.has(piece.sourceId)) continue;

    const fitsOnCurrentShelf =
      cursorX + piece.width <= rollWidth + 0.0001 &&
      shelfY + piece.length <= rollLength + 0.0001;

    if (!fitsOnCurrentShelf || cursorX + piece.width > rollWidth + 0.0001) {
      shelfY += shelfHeight;
      cursorX = 0;
      shelfHeight = 0;
    }

    if (shelfY + piece.length > rollLength + 0.0001) {
      const splitNote =
        piece.splitCount && piece.splitCount > 1
          ? ` (faixa ${piece.splitIndex}/${piece.splitCount})`
          : '';
      markSourceUnplaced(
        piece,
        `Sem espaço no comprimento do rolo para ${piece.name}${splitNote} (necessário ${piece.length.toFixed(2)} m, restam ${Math.max(0, rollLength - shelfY).toFixed(2)} m).`,
      );
      continue;
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
      sourceId: piece.sourceId,
      splitIndex: piece.splitIndex,
      splitCount: piece.splitCount,
    });

    cursorX += piece.width;
    shelfHeight = Math.max(shelfHeight, piece.length);
  }

  const usedLength = placed.length > 0
    ? Math.max(...placed.map((part) => part.y + part.height))
    : 0;

  return {
    rollWidth,
    rollLength,
    placed,
    unplaced,
    usedLength,
    allFit: unplaced.length === 0 && parts.length > 0,
  };
}

/**
 * Repete o plano de corte de um veículo em sequência (+1, +2, …) ao longo do rolo.
 * O material total = plano unitário × quantidade de veículos.
 */
export function buildFleetNestingLayout(
  perVehicle: RollNestingResult,
  vehicleQuantity: number,
): RollNestingResult {
  const qty = Math.max(1, Math.floor(vehicleQuantity));
  if (qty <= 1) return perVehicle;

  const lengthPerCopy = perVehicle.usedLength;
  if (lengthPerCopy <= 0.0001) {
    return { ...perVehicle };
  }

  const placed: PlacedPart[] = [];
  for (let copy = 0; copy < qty; copy++) {
    const yOffset = copy * lengthPerCopy;
    for (const part of perVehicle.placed) {
      placed.push({
        ...part,
        id: `${part.id}::c${copy}`,
        y: part.y + yOffset,
        vehicleCopyIndex: copy + 1,
      });
    }
  }

  const totalUsedLength = lengthPerCopy * qty;
  const visualRollLength = Math.max(perVehicle.rollLength, totalUsedLength);

  return {
    rollWidth: perVehicle.rollWidth,
    rollLength: visualRollLength,
    placed,
    unplaced: perVehicle.unplaced,
    usedLength: totalUsedLength,
    allFit: perVehicle.allFit,
  };
}

/** Margem para cortes, sobreposição e perdas na aplicação. */
export const ROLL_WASTE_FACTOR = 1.15;

export interface RollMaterialUsage {
  usedLength: number;
  usedLengthPerVehicle?: number;
  rollWidth: number;
  rollAreaM2: number;
  materialM2: number;
  vehicleQuantity?: number;
  rollsNeeded?: number;
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

/** Área faturável = soma das peças efetivamente usadas no rolo × 1,15. */
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

  const nestingPerVehicle = packPartsOnRoll(parts, rollWidth, rollLength);
  const rollAreaM2PerVehicle = placedPartsAreaM2(nestingPerVehicle.placed);
  const usedLengthPerVehicle = nestingPerVehicle.usedLength;
  const rollAreaM2 = rollAreaM2PerVehicle * vehicleQuantity;
  const usedLength = usedLengthPerVehicle * vehicleQuantity;
  const materialM2 = rollAreaM2 * wasteFactor;
  const rollsNeeded =
    rollLength > 0.001 ? Math.max(1, Math.ceil(usedLength / rollLength)) : 1;
  const nesting = buildFleetNestingLayout(nestingPerVehicle, vehicleQuantity);

  return {
    usedLength,
    usedLengthPerVehicle: vehicleQuantity > 1 ? usedLengthPerVehicle : undefined,
    rollWidth,
    rollAreaM2,
    materialM2,
    vehicleQuantity: vehicleQuantity > 1 ? vehicleQuantity : undefined,
    rollsNeeded: rollsNeeded > 1 ? rollsNeeded : undefined,
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
