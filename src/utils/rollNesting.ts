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
): { width: number; height: number; rotated: boolean } | null {
  if (partWidth <= rollWidth) {
    return { width: partWidth, height: partLength, rotated: false };
  }
  if (partLength <= rollWidth) {
    return { width: partLength, height: partWidth, rotated: true };
  }
  return null;
}

/** Empacota peças no rolo (largura × comprimento) com algoritmo de prateleiras. */
export function packPartsOnRoll(
  parts: NestingPartInput[],
  rollWidth: number,
  rollLength: number,
): RollNestingResult {
  const placed: PlacedPart[] = [];
  const unplaced: UnplacedPart[] = [];

  const sorted = [...parts].sort(
    (a, b) => Math.max(b.width, b.length) - Math.max(a.width, a.length),
  );

  let shelfY = 0;
  let shelfHeight = 0;
  let cursorX = 0;

  for (const part of sorted) {
    const orientation = bestOrientation(part.width, part.length, rollWidth);
    if (!orientation) {
      unplaced.push({
        id: part.id,
        name: part.name,
        width: part.width,
        length: part.length,
        reason: `Largura da peça (${Math.max(part.width, part.length).toFixed(2)} m) excede a largura do rolo (${rollWidth.toFixed(2)} m).`,
      });
      continue;
    }

    const fitsOnCurrentShelf =
      cursorX + orientation.width <= rollWidth + 0.0001 &&
      shelfY + orientation.height <= rollLength + 0.0001;

    if (!fitsOnCurrentShelf || cursorX + orientation.width > rollWidth + 0.0001) {
      shelfY += shelfHeight;
      cursorX = 0;
      shelfHeight = 0;
    }

    if (shelfY + orientation.height > rollLength + 0.0001) {
      unplaced.push({
        id: part.id,
        name: part.name,
        width: part.width,
        length: part.length,
        reason: `Sem espaço no comprimento do rolo (necessário ${orientation.height.toFixed(2)} m, restam ${Math.max(0, rollLength - shelfY).toFixed(2)} m).`,
      });
      continue;
    }

    placed.push({
      id: part.id,
      name: part.name,
      x: cursorX,
      y: shelfY,
      width: orientation.width,
      height: orientation.height,
      rotated: orientation.rotated,
      originalWidth: part.width,
      originalLength: part.length,
    });

    cursorX += orientation.width;
    shelfHeight = Math.max(shelfHeight, orientation.height);
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

/** Margem para cortes, sobreposição e perdas na aplicação. */
export const ROLL_WASTE_FACTOR = 1.15;

export interface RollMaterialUsage {
  usedLength: number;
  rollWidth: number;
  rollAreaM2: number;
  materialM2: number;
  nesting: RollNestingResult;
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
  wasteFactor = ROLL_WASTE_FACTOR,
): RollMaterialUsage {
  const nesting = packPartsOnRoll(parts, rollWidth, rollLength);
  const rollAreaM2 = placedPartsAreaM2(nesting.placed);
  const materialM2 = rollAreaM2 * wasteFactor;
  return {
    usedLength: nesting.usedLength,
    rollWidth,
    rollAreaM2,
    materialM2,
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
