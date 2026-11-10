import { BudgetLineItem, Material, Vehicle } from '../types';
import { getMaterialRollDimensions } from './materialRoll';
import { packPartsIntoRolls, type NestingPartInput, type RollNestingResult } from './rollNesting';
import { getPartInfo, hasPartMeasurement } from './vehiclePartsUtils';

/** Cortes de um mesmo material (e mesma medida de rolo), encaixados juntos. */
export interface MaterialCuttingGroup {
  key: string;
  materialId: string;
  material?: Material;
  rollWidth: number;
  rollLength: number;
  parts: NestingPartInput[];
  /** Itens do orçamento que usam este material. */
  itemLabels: string[];
  nesting: RollNestingResult;
  rollsNeeded: number;
}

export interface BudgetCuttingPlan {
  groups: MaterialCuttingGroup[];
  /** Itens cujo material não tem medida de rolo cadastrada. */
  itemsWithoutRoll: string[];
}

function numberSelection(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/** Peças de um item com medida, já repetidas pela quantidade (frota ou peças iguais). */
function itemParts(item: BudgetLineItem, itemIndex: number, vehicles: Vehicle[]): NestingPartInput[] {
  const prefix = `i${itemIndex}`;
  const tag = `#${itemIndex + 1}`;

  if (item.vehicleId) {
    const vehicle = vehicles.find((v) => v.id === item.vehicleId);
    if (!vehicle) return [];
    const copies = Math.max(1, Math.floor(item.vehicleQuantity ?? 1));
    const parts = item.items
      .filter((piece) => hasPartMeasurement(vehicle, piece.partId))
      .map((piece) => {
        const m = vehicle.partMeasurements[piece.partId]!;
        return {
          id: piece.partId,
          baseId: piece.partId,
          name: getPartInfo(piece.partId, vehicle).name,
          width: m.width,
          length: m.length,
        };
      });
    return Array.from({ length: copies }, (_, copy) =>
      parts.map((part) => ({
        ...part,
        id: `${prefix}:${part.id}:c${copy}`,
        name: copies > 1 ? `${tag} ${part.name} (+${copy + 1})` : `${tag} ${part.name}`,
      })),
    ).flat();
  }

  return item.items.flatMap((piece) => {
    const width = piece.width ?? 0;
    const length = piece.height ?? 0;
    if (width <= 0 || length <= 0) return [];
    const qty = Math.max(1, Math.floor(piece.quantity || 1));
    const name = `${tag} ${piece.name || 'Peça'}`;
    return Array.from({ length: qty }, (_, index) => ({
      id: `${prefix}:${piece.partId}:q${index}`,
      name: qty > 1 ? `${name} (${index + 1}/${qty})` : name,
      width,
      length,
    }));
  });
}

/**
 * Plano de corte do orçamento inteiro: os cortes só dividem um rolo quando são
 * do mesmo material e da mesma medida de rolo; cada material distinto ganha o
 * próprio rolo. O preço de cada item continua vindo do cálculo do próprio item.
 */
export function buildBudgetCuttingPlan(
  lineItems: BudgetLineItem[],
  materials: Material[],
  vehicles: Vehicle[] = [],
): BudgetCuttingPlan {
  const groups = new Map<string, Omit<MaterialCuttingGroup, 'nesting' | 'rollsNeeded'>>();
  const itemsWithoutRoll: string[] = [];

  lineItems.forEach((item, index) => {
    const material = materials.find((m) => m.id === item.materialId);
    const editor = item.editor ?? {};
    const roll = getMaterialRollDimensions(material, {
      width: numberSelection(editor.selectedRollWidth),
      length: numberSelection(editor.selectedRollLength),
    });
    if (!roll) {
      itemsWithoutRoll.push(item.label);
      return;
    }

    const parts = itemParts(item, index, vehicles);
    if (parts.length === 0) return;

    const key = `${item.materialId}|${roll.width}|${roll.length}`;
    const group = groups.get(key);
    if (group) {
      group.parts.push(...parts);
      group.itemLabels.push(item.label);
    } else {
      groups.set(key, {
        key,
        materialId: item.materialId,
        material,
        rollWidth: roll.width,
        rollLength: roll.length,
        parts: [...parts],
        itemLabels: [item.label],
      });
    }
  });

  return {
    groups: [...groups.values()].map((group) => {
      const nesting = packPartsIntoRolls(group.parts, group.rollWidth, group.rollLength);
      return { ...group, nesting, rollsNeeded: Math.max(1, nesting.rolls.length) };
    }),
    itemsWithoutRoll,
  };
}
