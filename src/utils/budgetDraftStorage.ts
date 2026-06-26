import { DecorativeItem } from '../types';
import { databaseService } from '../services/databaseService';

export type BudgetDraftKind = 'automotive' | 'decorative';

export interface AutomotiveBudgetDraft {
  customerName: string;
  selectedMake: string;
  selectedModel: string;
  selectedYear: string;
  selectedVehicleId: string;
  vehicleQuantity: number;
  budgetType: 'Completo' | 'Parcial';
  selectedPieces: string[];
  selectedMaterialId: string;
  customPricePerM2: number | null;
  selectedRollWidth: number | null;
  selectedRollLength: number | null;
  activeStep: number;
}

export interface DecorativeBudgetDraft {
  customerName: string;
  subType: 'Móveis' | 'Eletrodomésticos' | 'Parede';
  selectedApplianceMake: string;
  selectedApplianceType: string;
  selectedApplianceId: string;
  syncedApplianceId: string | null;
  items: DecorativeItem[];
  selectedMaterialId: string;
  customPricePerM2: number | null;
  selectedRollWidth: number | null;
  selectedRollLength: number | null;
  activeStep: number;
}

function draftKey(kind: BudgetDraftKind): string {
  const userId = databaseService.getCachedUser()?.id ?? 'guest';
  return `aplica_pro_budget_draft_${kind}_${userId}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadAutomotiveBudgetDraft(): AutomotiveBudgetDraft | null {
  return readJson<AutomotiveBudgetDraft>(draftKey('automotive'));
}

export function saveAutomotiveBudgetDraft(draft: AutomotiveBudgetDraft): void {
  try {
    sessionStorage.setItem(draftKey('automotive'), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearAutomotiveBudgetDraft(): void {
  sessionStorage.removeItem(draftKey('automotive'));
}

export function loadDecorativeBudgetDraft(): DecorativeBudgetDraft | null {
  return readJson<DecorativeBudgetDraft>(draftKey('decorative'));
}

export function saveDecorativeBudgetDraft(draft: DecorativeBudgetDraft): void {
  try {
    sessionStorage.setItem(draftKey('decorative'), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearDecorativeBudgetDraft(): void {
  sessionStorage.removeItem(draftKey('decorative'));
}

export function hasAutomotiveBudgetDraft(): boolean {
  return loadAutomotiveBudgetDraft() !== null;
}

export function hasDecorativeBudgetDraft(): boolean {
  return loadDecorativeBudgetDraft() !== null;
}
