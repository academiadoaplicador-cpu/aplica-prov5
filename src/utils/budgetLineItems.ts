import { Budget, BudgetLineItem } from '../types';

/** Itens do orçamento; orçamentos antigos (sem lista) viram um item só. */
export function getBudgetLineItems(budget: Budget): BudgetLineItem[] {
  if (budget.lineItems && budget.lineItems.length > 0) return budget.lineItems;
  return [
    {
      id: budget.id,
      label: budget.vehicleModel || budget.applianceModel || 'Projeto personalizado',
      vehicleId: budget.vehicleId,
      vehicleQuantity: budget.vehicleQuantity,
      subType: budget.subType,
      items: budget.items ?? [],
      materialId: budget.materialId,
      customPricePerM2: budget.customPricePerM2,
      rollsNeeded: budget.rollsNeeded,
      totalHours: Number(budget.totalHours) || 0,
      totalMaterialMeters: Number(budget.totalMaterialMeters) || 0,
      totalMaterialM2: Number(budget.totalMaterialM2) || 0,
      totalCost: Number(budget.totalCost) || 0,
      totalPrice: Number(budget.totalPrice) || 0,
      profit: Number(budget.profit) || 0,
    },
  ];
}

function sum(items: BudgetLineItem[], key: keyof BudgetLineItem): number {
  return items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

/**
 * Monta o orçamento a partir dos itens: totais somados e as colunas antigas
 * (veículo, material, peças) preenchidas para listagens e buscas continuarem
 * funcionando. Com um item só, o orçamento fica igual ao formato anterior.
 */
export function consolidateBudget(
  base: Pick<Budget, 'id' | 'customerName' | 'status' | 'date' | 'description' | 'type'>,
  lineItems: BudgetLineItem[],
): Budget {
  const first = lineItems[0];
  const single = lineItems.length === 1;
  const subTypes = new Set(lineItems.map((item) => item.subType).filter(Boolean));

  return {
    ...base,
    vehicleModel: lineItems.map((item) => item.label).join(' + '),
    vehicleId: first?.vehicleId,
    vehicleQuantity: single ? first?.vehicleQuantity : undefined,
    rollsNeeded: single ? first?.rollsNeeded : undefined,
    items: first?.items ?? [],
    materialId: first?.materialId ?? '',
    customPricePerM2: single ? first?.customPricePerM2 : undefined,
    subType: subTypes.size === 1 ? first?.subType : undefined,
    totalHours: sum(lineItems, 'totalHours'),
    totalMaterialMeters: sum(lineItems, 'totalMaterialMeters'),
    totalMaterialM2: sum(lineItems, 'totalMaterialM2'),
    totalCost: sum(lineItems, 'totalCost'),
    totalPrice: sum(lineItems, 'totalPrice'),
    profit: sum(lineItems, 'profit'),
    lineItems,
  };
}
