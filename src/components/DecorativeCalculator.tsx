import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Trash2,
  Copy,
  Package,
  LayoutDashboard,
  Maximize,
  ChevronDown,
  Info,
  Zap,
  Refrigerator,
  Layout,
  AlertTriangle,
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { FinancialSettings, Material, DecorativeItem, Appliance } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { pdfService } from '../services/pdfService';
import PageHeader from './settings/PageHeader';
import BudgetSavePdfActions from './BudgetSavePdfActions';
import BudgetFlowStepper, { type BudgetFlowStep } from './BudgetFlowStepper';
import BudgetWizardNavBar from './BudgetWizardNavBar';
import { useBudgetWizard } from '../hooks/useBudgetWizard';
import { useMobileBottomExtras } from '../contexts/MobileBottomExtrasContext';
import BudgetMobileStepHeader from './budget-mobile/BudgetMobileStepHeader';
import BudgetCollapsibleMaterialPanel from './budget-mobile/BudgetCollapsibleMaterialPanel';
import BudgetMobileTotalHero from './budget-mobile/BudgetMobileTotalHero';
import {
  mobileStepPanelClass,
  mobileFieldLabel,
  mobileFieldInput,
  mobileSelectInput,
} from './budget-mobile/budgetMobileStyles';
import MaterialCascadeSelect from './MaterialCascadeSelect';
import MaterialRollDimensionSelect from './MaterialRollDimensionSelect';
import RollNestingPreview from './RollNestingPreview';
import { filterMaterialsByContext, getMaterialProductLine } from '../utils/materialSelection';
import SupplierWhatsAppButton from './SupplierWhatsAppButton';
import {
  clearDecorativeBudgetDraft,
  loadDecorativeBudgetDraft,
  saveDecorativeBudgetDraft,
} from '../utils/budgetDraftStorage';
import { getMaterialRollDimensions } from '../utils/materialRoll';
import { computeRollMaterialUsage, ROLL_WASTE_FACTOR } from '../utils/rollNesting';
import type { NestingPartInput } from '../utils/rollNesting';
import BudgetNotice from './budget-mobile/BudgetNotice';
import { useBudgetNotice } from '../hooks/useBudgetNotice';
import { useBudgetDraftPersistence } from '../hooks/useBudgetDraftPersistence';

type SubType = 'Móveis' | 'Eletrodomésticos' | 'Parede';
type DimensionField = 'width' | 'height';

function itemQuantity(item: DecorativeItem): number {
  return Math.max(1, Math.floor(item.quantity ?? 1));
}

function expandItemsForNesting(items: DecorativeItem[]): NestingPartInput[] {
  return items.flatMap((item) => {
    if (item.width <= 0 || item.height <= 0) return [];
    const qty = itemQuantity(item);
    if (qty <= 1) {
      return [{ id: item.id, name: item.name, width: item.width, length: item.height }];
    }
    return Array.from({ length: qty }, (_, index) => ({
      id: `${item.id}::q${index}`,
      name: `${item.name} (${index + 1}/${qty})`,
      width: item.width,
      length: item.height,
    }));
  });
}
type DimensionDrafts = Record<string, Partial<Record<DimensionField, string>>>;

function normalizeDecimalInput(raw: string): string {
  return raw.replace(',', '.').trim();
}

function isValidDecimalDraft(value: string): boolean {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

function formatDimensionForDisplay(value: number): string {
  return value === 0 ? '' : String(value);
}

function parseDimensionDraft(raw: string): number {
  const normalized = normalizeDecimalInput(raw);
  if (normalized === '' || normalized === '.') return 0;
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function DecorativeCalculator() {
  const restoredDraft = useRef(loadDecorativeBudgetDraft());
  const isRestoringDraftRef = useRef(Boolean(restoredDraft.current));

  const [customerName, setCustomerName] = useState(restoredDraft.current?.customerName ?? '');
  const [subType, setSubType] = useState<SubType>(
    restoredDraft.current?.subType ?? 'Eletrodomésticos',
  );
  const [selectedApplianceMake, setSelectedApplianceMake] = useState(
    restoredDraft.current?.selectedApplianceMake ?? '',
  );
  const [selectedApplianceType, setSelectedApplianceType] = useState(
    restoredDraft.current?.selectedApplianceType ?? '',
  );
  const [selectedApplianceId, setSelectedApplianceId] = useState(
    restoredDraft.current?.selectedApplianceId ?? '',
  );

  const [items, setItems] = useState<DecorativeItem[]>(
    restoredDraft.current?.items ?? [
      { id: generateId(), name: 'Peça Principal', width: 0, height: 0, complexity: 1 },
    ],
  );
  const [dimensionDrafts, setDimensionDrafts] = useState<DimensionDrafts>({});
  const syncedApplianceIdRef = useRef<string | null>(
    restoredDraft.current?.syncedApplianceId ?? null,
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState(
    restoredDraft.current?.selectedMaterialId ?? '',
  );
  const [customPricePerM2, setCustomPricePerM2] = useState<number | null>(
    restoredDraft.current?.customPricePerM2 ?? null,
  );
  const [selectedRollWidth, setSelectedRollWidth] = useState<number | null>(
    restoredDraft.current?.selectedRollWidth ?? null,
  );
  const [selectedRollLength, setSelectedRollLength] = useState<number | null>(
    restoredDraft.current?.selectedRollLength ?? null,
  );
  const [materialExpanded, setMaterialExpanded] = useState(
    !restoredDraft.current?.selectedMaterialId,
  );
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const { notice, showNotice, clearNotice } = useBudgetNotice();
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<FinancialSettings>({
    hourlyRate: 50,
    profitMarginPercentage: 30,
    taxPercentage: 6,
    fixedCosts: 1500,
  });

  useEffect(() => {
    Promise.all([
      databaseService.getAppliances(),
      databaseService.getMaterials(),
      databaseService.getFinancialSettings(),
    ]).then(([a, m, s]) => {
      setAppliances(a);
      setMaterials(m);
      setSettings(s);
    });
  }, []);

  useEffect(() => {
    if (!selectedMaterialId || materials.length === 0) return;
    const allowed = filterMaterialsByContext(materials, { mode: 'decorative', subType });
    if (!allowed.some((m) => m.id === selectedMaterialId)) {
      setSelectedMaterialId('');
      setCustomPricePerM2(null);
    }
  }, [subType, materials, selectedMaterialId]);

  // Filter options for 3-level select
  const applianceMakes = useMemo(() => Array.from(new Set(appliances.map(a => a.make))), [appliances]);
  const applianceTypes = useMemo(() => {
    if (!selectedApplianceMake) return [];
    return Array.from(new Set(appliances.filter(a => a.make === selectedApplianceMake).map(a => a.type)));
  }, [selectedApplianceMake, appliances]);
  const applianceModels = useMemo(() => {
    if (!selectedApplianceMake || !selectedApplianceType) return [];
    return appliances.filter(a => a.make === selectedApplianceMake && a.type === selectedApplianceType as any);
  }, [selectedApplianceMake, selectedApplianceType, appliances]);

  // Preenche peças ao escolher eletrodoméstico; não sobrescreve edições manuais depois.
  useEffect(() => {
    if (isRestoringDraftRef.current) return;
    if (subType !== 'Eletrodomésticos') {
      syncedApplianceIdRef.current = null;
      return;
    }
    if (!selectedApplianceId) {
      syncedApplianceIdRef.current = null;
      return;
    }
    if (syncedApplianceIdRef.current === selectedApplianceId) return;

    const app = appliances.find((a) => a.id === selectedApplianceId);
    if (!app) return;

    syncedApplianceIdRef.current = selectedApplianceId;
    setDimensionDrafts({});
    setItems([
      { id: generateId(), name: `Frente (${app.type})`, width: app.width, height: app.height, complexity: 2 },
      { id: generateId(), name: 'Lateral Dir', width: app.depth, height: app.height, complexity: 1 },
      { id: generateId(), name: 'Lateral Esq', width: app.depth, height: app.height, complexity: 1 },
    ]);
  }, [selectedApplianceId, subType, appliances]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: generateId(), name: 'Nova Peça', width: 0, height: 0, complexity: 1 },
    ]);
    showNotice('Nova peça adicionada. Preencha o nome e as medidas.', 'success');
  };

  const updateItem = useCallback((id: string, updates: Partial<DecorativeItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const effectiveItems = useMemo((): DecorativeItem[] => {
    return items.map((item) => {
      const drafts = dimensionDrafts[item.id];
      if (!drafts) return item;
      return {
        ...item,
        width:
          drafts.width !== undefined ? parseDimensionDraft(drafts.width) : item.width,
        height:
          drafts.height !== undefined ? parseDimensionDraft(drafts.height) : item.height,
      };
    });
  }, [items, dimensionDrafts]);

  const validatePieces = useCallback((pieceItems: DecorativeItem[]): string | null => {
    if (pieceItems.length === 0) return 'Adicione ao menos uma peça ao orçamento.';
    for (const item of pieceItems) {
      const label = item.name.trim() || 'sem nome';
      if (!item.name.trim()) return 'Informe o nome de todas as peças.';
      if (item.width <= 0) return `Informe a largura da peça "${label}".`;
      if (item.height <= 0) return `Informe a altura da peça "${label}".`;
    }
    return null;
  }, []);

  const getExportValidationMessage = useCallback((): string | null => {
    if (!customerName.trim()) return 'Informe o nome do cliente.';
    if (subType === 'Eletrodomésticos' && !selectedApplianceId) {
      return 'Selecione marca, tipo e modelo do eletrodoméstico.';
    }
    const piecesError = validatePieces(effectiveItems);
    if (piecesError) return piecesError;
    if (!selectedMaterialId) return 'Selecione o material antes de salvar ou gerar o PDF.';
    return null;
  }, [
    customerName,
    subType,
    selectedApplianceId,
    effectiveItems,
    validatePieces,
    selectedMaterialId,
  ]);

  const getStepValidationMessage = useCallback(
    (stepIndex: number): string | null => {
      switch (stepIndex) {
        case 0:
          if (!customerName.trim()) return 'Informe o nome do cliente.';
          if (subType === 'Eletrodomésticos' && !selectedApplianceId) {
            return 'Selecione marca, tipo e modelo do eletrodoméstico.';
          }
          return null;
        case 1:
          return validatePieces(effectiveItems);
        case 2:
          if (!selectedMaterialId) return 'Selecione o material para continuar.';
          return null;
        default:
          return getExportValidationMessage();
      }
    },
    [
      customerName,
      subType,
      selectedApplianceId,
      effectiveItems,
      validatePieces,
      selectedMaterialId,
      getExportValidationMessage,
    ],
  );
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDimensionDrafts((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const duplicateItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(999, itemQuantity(item) + 1) }
          : item,
      ),
    );
    showNotice('Quantidade da peça aumentada.', 'success');
  };

  const decrementItemQuantity = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextQty = itemQuantity(item) - 1;
        return { ...item, quantity: nextQty <= 1 ? undefined : nextQty };
      }),
    );
  };

  const getDimensionDisplay = useCallback(
    (itemId: string, field: DimensionField, value: number) => {
      const draft = dimensionDrafts[itemId]?.[field];
      if (draft !== undefined) return draft;
      return formatDimensionForDisplay(value);
    },
    [dimensionDrafts],
  );

  const handleDimensionChange = useCallback(
    (itemId: string, field: DimensionField, raw: string) => {
      const normalized = normalizeDecimalInput(raw);
      if (!isValidDecimalDraft(normalized)) return;

      setDimensionDrafts((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], [field]: normalized },
      }));

      if (normalized === '' || normalized === '.') {
        updateItem(itemId, { [field]: 0 });
        return;
      }

      const parsed = parseFloat(normalized);
      if (!Number.isNaN(parsed)) {
        updateItem(itemId, { [field]: parsed });
      }
    },
    [updateItem],
  );

  const handleDimensionBlur = useCallback(
    (itemId: string, field: DimensionField) => {
      let committed: number | undefined;

      setDimensionDrafts((prev) => {
        const draft = prev[itemId]?.[field];
        if (draft !== undefined) {
          committed = parseDimensionDraft(draft);
        }

        if (!prev[itemId]) return prev;
        const entry = { ...prev[itemId] };
        delete entry[field];
        const next = { ...prev };
        if (Object.keys(entry).length === 0) delete next[itemId];
        else next[itemId] = entry;
        return next;
      });

      if (committed !== undefined) {
        updateItem(itemId, { [field]: committed });
      }
    },
    [updateItem],
  );

  useEffect(() => {
    if (!selectedMaterialId) setMaterialExpanded(true);
  }, [selectedMaterialId]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const selectedAppliance = appliances.find((a) => a.id === selectedApplianceId);
  const isRecommended = selectedMaterial?.recommendedFor.includes(subType);

  useEffect(() => {
    if (isRestoringDraftRef.current) return;
    setSelectedRollWidth(null);
    setSelectedRollLength(null);
  }, [selectedMaterialId]);

  useEffect(() => {
    isRestoringDraftRef.current = false;
  }, []);

  const rollDimensions = useMemo(
    () =>
      getMaterialRollDimensions(selectedMaterial, {
        width: selectedRollWidth ?? undefined,
        length: selectedRollLength ?? undefined,
      }),
    [selectedMaterial, selectedRollWidth, selectedRollLength],
  );

  const nestingParts = useMemo(
    (): NestingPartInput[] => expandItemsForNesting(effectiveItems),
    [effectiveItems],
  );

  const totals = useMemo(() => {
    const totalM2 = effectiveItems.reduce(
      (acc, item) => acc + item.width * item.height * itemQuantity(item),
      0,
    );

    const totalHours = effectiveItems.reduce((acc, item) => {
      const baseTime = item.width * item.height * itemQuantity(item);
      const multiplier = item.complexity === 1 ? 1.5 : item.complexity === 2 ? 2.5 : 4;
      return acc + baseTime * multiplier;
    }, 0);

    const material = materials.find(m => m.id === selectedMaterialId);
    const pricePerM2 = customPricePerM2 ?? (material?.pricePerM2 || 0);

    let usedLength = 0;
    let rollAreaM2 = 0;
    let finalM2 = 0;
    let hasRollPricing = false;

    if (rollDimensions && nestingParts.length > 0) {
      const usage = computeRollMaterialUsage(
        nestingParts,
        rollDimensions.width,
        rollDimensions.length,
      );
      usedLength = usage.usedLength;
      rollAreaM2 = usage.rollAreaM2;
      finalM2 = usage.materialM2;
      hasRollPricing = true;
    }

    const materialCost = finalM2 * pricePerM2;
    const laborCost = totalHours * settings.hourlyRate;

    const baseCost = materialCost + laborCost;
    const totalPrice = baseCost * (1 + (settings.profitMarginPercentage / 100)) * (1 + (settings.taxPercentage / 100));
    const profit = totalPrice - baseCost - (totalPrice * (settings.taxPercentage / 100));

    return {
      m2: totalM2,
      usedLength,
      rollAreaM2,
      finalM2,
      hasRollPricing,
      hours: totalHours,
      cost: baseCost,
      price: totalPrice,
      profit,
    };
  }, [
    effectiveItems,
    nestingParts,
    rollDimensions,
    selectedMaterialId,
    customPricePerM2,
    materials,
    settings,
  ]);

  const currentBudget = useMemo(() => ({
    id: generateId(),
    customerName,
    vehicleModel: `${subType}${selectedApplianceId ? ': ' + appliances.find(a => a.id === selectedApplianceId)?.model : ''}`,
    status: 'Pendente' as const,
    date: new Date().toISOString(),
    items: effectiveItems.map((item) => ({
      partId: item.id,
      quantity: itemQuantity(item),
      name: item.name,
      width: item.width,
      height: item.height,
    })),
    materialId: selectedMaterialId,
    customPricePerM2: customPricePerM2 || undefined,
    totalHours: totals.hours,
    totalMaterialMeters: totals.usedLength,
    totalMaterialM2: totals.finalM2,
    totalCost: totals.cost,
    totalPrice: totals.price,
    profit: totals.profit,
    type: 'Decorativo' as const,
    subType
  }), [customerName, subType, selectedApplianceId, selectedMaterialId, customPricePerM2, totals, appliances, effectiveItems]);

  const budgetSnapshot = useMemo(
    () =>
      JSON.stringify({
        customerName,
        subType,
        selectedApplianceId,
        items: effectiveItems.map((item) => ({
          id: item.id,
          name: item.name,
          width: item.width,
          height: item.height,
          quantity: itemQuantity(item),
        })),
        selectedMaterialId,
        customPricePerM2,
        selectedRollWidth,
        selectedRollLength,
      }),
    [
      customerName,
      subType,
      selectedApplianceId,
      effectiveItems,
      selectedMaterialId,
      customPricePerM2,
      selectedRollWidth,
      selectedRollLength,
    ],
  );

  const isBudgetSaved = savedSnapshot === budgetSnapshot;

  const handleSave = async (): Promise<boolean> => {
    const validationError = getExportValidationMessage();
    if (validationError) {
      showNotice(validationError, 'warning');
      return false;
    }
    await databaseService.saveBudget(currentBudget);
    clearDecorativeBudgetDraft();
    setSavedSnapshot(budgetSnapshot);
    showNotice('Orçamento salvo com sucesso.', 'success');
    return true;
  };

  const handleGeneratePDF = async () => {
    const validationError = getExportValidationMessage();
    if (validationError) {
      showNotice(validationError, 'warning');
      throw new Error(validationError);
    }
    await pdfService.generateBudgetPDF(currentBudget, { material: selectedMaterial });
  };

  const canExportBudget = Boolean(
    !getExportValidationMessage() &&
      customerName &&
      selectedMaterialId &&
      effectiveItems.length > 0,
  );

  const flowSteps = useMemo((): BudgetFlowStep[] => {
    const clientReady =
      Boolean(customerName.trim()) &&
      (subType !== 'Eletrodomésticos' || Boolean(selectedApplianceId));
    const piecesReady =
      effectiveItems.length > 0 &&
      effectiveItems.every((i) => i.width > 0 && i.height > 0 && i.name.trim());

    return [
      {
        id: 'cliente',
        label:
          subType === 'Eletrodomésticos'
            ? 'Informe o cliente e escolha o eletrodoméstico'
            : 'Informe o cliente e a categoria do projeto',
        shortLabel: 'Cliente',
        complete: clientReady,
      },
      {
        id: 'pecas',
        label: 'Confira ou ajuste as medidas das peças',
        shortLabel: 'Peças',
        complete: piecesReady,
      },
      {
        id: 'material',
        label: 'Selecione o material e o rolo',
        shortLabel: 'Material',
        complete: Boolean(selectedMaterialId),
      },
      {
        id: 'resumo',
        label: 'Revise valores e salve o orçamento',
        shortLabel: 'Revisar',
        complete: canExportBudget,
      },
    ];
  }, [customerName, subType, selectedApplianceId, effectiveItems, selectedMaterialId, canExportBudget]);

  const wizard = useBudgetWizard(flowSteps, restoredDraft.current?.activeStep ?? 0);

  const materialContext = useMemo(
    () => ({ mode: 'decorative' as const, subType }),
    [subType],
  );

  const isMaterialStepActive = wizard.activeStep === 2;

  const blurActiveField = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const tryGoNext = useCallback(() => {
    blurActiveField();
    const validationError = getStepValidationMessage(wizard.activeStep);
    if (validationError) {
      showNotice(validationError, 'warning');
      return;
    }
    wizard.goNext();
  }, [getStepValidationMessage, wizard, showNotice]);

  const tryGoToStep = useCallback(
    (index: number) => {
      if (index === wizard.activeStep) return;

      if (index < wizard.activeStep) {
        wizard.goToStep(index);
        return;
      }

      blurActiveField();
      for (let step = wizard.activeStep; step < index; step++) {
        const validationError = getStepValidationMessage(step);
        if (validationError) {
          showNotice(validationError, 'warning');
          wizard.goToStep(step);
          return;
        }
      }
      wizard.goToStep(index);
    },
    [getStepValidationMessage, wizard, showNotice],
  );

  useBudgetDraftPersistence(
    () => ({
      customerName,
      subType,
      selectedApplianceMake,
      selectedApplianceType,
      selectedApplianceId,
      syncedApplianceId: syncedApplianceIdRef.current,
      items,
      selectedMaterialId,
      customPricePerM2,
      selectedRollWidth,
      selectedRollLength,
      activeStep: wizard.activeStep,
    }),
    () =>
      Boolean(
        customerName.trim() ||
          selectedMaterialId ||
          items.some((i) => i.width > 0 || i.height > 0 || i.name !== 'Peça Principal') ||
          selectedApplianceId,
      ),
    saveDecorativeBudgetDraft,
    clearDecorativeBudgetDraft,
  );

  const wizardNavBar = useMemo(
    () => (
      <BudgetWizardNavBar
        activeStep={wizard.activeStep}
        totalSteps={flowSteps.length}
        stepLabel={flowSteps[wizard.activeStep]?.shortLabel ?? ''}
        total={totals.price}
        showTotal={wizard.activeStep >= 2}
        canGoBack={wizard.canGoBack}
        canGoNext={wizard.activeStep < flowSteps.length - 1}
        onBack={wizard.goBack}
        onNext={tryGoNext}
        accent="emerald"
      />
    ),
    [
      wizard.activeStep,
      wizard.canGoBack,
      wizard.goBack,
      flowSteps,
      totals.price,
      tryGoNext,
    ],
  );

  useMobileBottomExtras(wizardNavBar);

  return (
    <div className="space-y-4 lg:space-y-8 w-full pb-4 lg:pb-20">
      <BudgetNotice notice={notice} onDismiss={clearNotice} accent="emerald" />
      <div className="hidden lg:block">
        <PageHeader
          title="Decorativo"
          description="Orçamentos para móveis, eletrodomésticos e paredes"
        />
      </div>

      <BudgetFlowStepper
        steps={flowSteps}
        activeStep={wizard.activeStep}
        onStepChange={tryGoToStep}
        canGoToStep={wizard.canGoToStep}
        accent="emerald"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 lg:items-start">
        <div
          className={cn(
            'space-y-6 lg:col-span-2',
            wizard.activeStep === 2 ? 'order-2 lg:order-none' : 'order-1',
          )}
        >
          <section
            className={cn(mobileStepPanelClass('emerald', wizard.stepPanelClass(0)), 'space-y-6')}
          >
            <BudgetMobileStepHeader
              step={1}
              title="Cliente e projeto"
              description="Identifique o cliente e o tipo de aplicação."
              accent="emerald"
            />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
              <div className="space-y-2">
                <label className={mobileFieldLabel}>Nome do Cliente</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className={cn(mobileFieldInput, 'focus:ring-emerald-500')}
                />
              </div>
              <div className="space-y-2">
                <label className={mobileFieldLabel}>Categoria</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2">
                  {(['Eletrodomésticos', 'Móveis', 'Parede'] as SubType[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        if (cat === subType) return;
                        setSubType(cat);
                        setSelectedApplianceId('');
                        setSelectedApplianceMake('');
                        setSelectedApplianceType('');
                        syncedApplianceIdRef.current = null;
                        setDimensionDrafts({});
                        if (cat === 'Parede') {
                          setItems([
                            {
                              id: generateId(),
                              name: 'Parede 1',
                              width: 0,
                              height: 0,
                              complexity: 1,
                            },
                          ]);
                        } else if (cat === 'Móveis') {
                          setItems([
                            {
                              id: generateId(),
                              name: 'Peça Principal',
                              width: 0,
                              height: 0,
                              complexity: 1,
                            },
                          ]);
                        } else {
                          setItems([
                            {
                              id: generateId(),
                              name: 'Peça Principal',
                              width: 0,
                              height: 0,
                              complexity: 1,
                            },
                          ]);
                        }
                      }}
                      className={cn(
                        "w-full min-h-[4rem] sm:min-h-0 sm:p-3 p-3.5 rounded-2xl border text-[10px] font-bold uppercase transition-all active:scale-[0.98]",
                        subType === cat
                          ? "bg-emerald-600/15 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-950/20"
                          : "bg-slate-950/80 border-slate-800 text-slate-500"
                      )}
                    >
                      {cat === 'Eletrodomésticos' && <Refrigerator size={14} className="mx-auto mb-1" />}
                      {cat === 'Móveis' && <Layout size={14} className="mx-auto mb-1" />}
                      {cat === 'Parede' && <Maximize size={14} className="mx-auto mb-1" />}
                      {cat === 'Eletrodomésticos' ? 'Eletros' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {subType === 'Eletrodomésticos' && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-1 block">
                  Eletrodoméstico (catálogo)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <select 
                      value={selectedApplianceMake}
                      onChange={(e) => {
                        setSelectedApplianceMake(e.target.value);
                        setSelectedApplianceType('');
                        setSelectedApplianceId('');
                      }}
                      className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-base sm:text-xs text-white focus:ring-2 focus:ring-indigo-500 appearance-none transition-all font-sans"
                    >
                      <option value="">Marca...</option>
                      {applianceMakes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select 
                      value={selectedApplianceType}
                      disabled={!selectedApplianceMake}
                      onChange={(e) => {
                        setSelectedApplianceType(e.target.value);
                        setSelectedApplianceId('');
                      }}
                      className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-base sm:text-xs text-white focus:ring-2 focus:ring-indigo-500 appearance-none transition-all font-sans disabled:opacity-30"
                    >
                      <option value="">Tipo...</option>
                      {applianceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select 
                      value={selectedApplianceId}
                      disabled={!selectedApplianceType}
                      onChange={(e) => setSelectedApplianceId(e.target.value)}
                      className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-base sm:text-xs text-white focus:ring-2 focus:ring-indigo-500 appearance-none transition-all font-sans disabled:opacity-30"
                    >
                      <option value="">Modelo...</option>
                      {applianceModels.map(app => (
                        <option key={app.id} value={app.id}>{app.model}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
                {selectedAppliance && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase text-[9px] font-mono block mb-1">Dimensões</span>
                      <span className="font-mono text-white">
                        {selectedAppliance.width.toFixed(2)} × {selectedAppliance.height.toFixed(2)} × {selectedAppliance.depth.toFixed(2)} m
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[9px] font-mono block mb-1">Largura</span>
                      <span className="font-mono text-emerald-400">{selectedAppliance.width.toFixed(2)} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[9px] font-mono block mb-1">Altura</span>
                      <span className="font-mono text-emerald-400">{selectedAppliance.height.toFixed(2)} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[9px] font-mono block mb-1">Profundidade</span>
                      <span className="font-mono text-emerald-400">{selectedAppliance.depth.toFixed(2)} m</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section
            className={cn(mobileStepPanelClass('emerald', wizard.stepPanelClass(1)))}
          >
            <BudgetMobileStepHeader
              step={2}
              title="Peças e medidas"
              description="Ajuste faces, dimensões e dificuldade."
              accent="emerald"
            />
            <div className="flex justify-end -mt-2 mb-4 lg:mb-6">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors uppercase tracking-widest active:scale-[0.98]"
              >
                <Plus size={16} /> Adicionar peça
              </button>
            </div>
            <h3 className="hidden lg:block text-sm font-mono uppercase tracking-widest text-slate-500 mb-4">
              Detalhes das peças
            </h3>

            <div className="space-y-3 lg:space-y-4">
              {items.map((item) => {
                const qty = itemQuantity(item);
                return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={item.id}
                  className="p-4 lg:p-5 bg-slate-950/90 rounded-2xl border border-slate-800/90 group transition-all hover:border-slate-700 shadow-sm space-y-3"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-[9px] uppercase font-mono text-slate-500">Nome da Face</label>
                        {qty > 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 tabular-nums">
                            ×{qty}
                          </span>
                        )}
                      </div>
                      <input
                        className="bg-slate-900 border border-slate-800 p-2.5 sm:p-2 rounded-lg text-xs font-bold text-white w-full focus:ring-1 focus:ring-emerald-500"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="flex shrink-0 gap-0.5 pb-0.5">
                      {qty > 1 && (
                        <button
                          type="button"
                          onClick={() => decrementItemQuantity(item.id)}
                          title="Diminuir quantidade"
                          aria-label={`Diminuir quantidade de ${item.name}`}
                          className="text-slate-600 hover:text-emerald-400 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 transition-all text-lg font-bold leading-none"
                        >
                          −
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => duplicateItem(item.id)}
                        title={qty > 1 ? `Aumentar quantidade (atual: ×${qty})` : 'Duplicar peça (×2)'}
                        aria-label={`Duplicar ${item.name}`}
                        className="text-slate-600 hover:text-emerald-400 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 transition-all"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        title="Remover peça"
                        aria-label={`Remover ${item.name}`}
                        className="text-slate-600 hover:text-red-400 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Largura (m)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="bg-slate-900 border border-slate-800 p-2.5 sm:p-2 rounded-lg text-xs text-white w-full font-mono"
                        value={getDimensionDisplay(item.id, 'width', item.width)}
                        placeholder="0,00"
                        onChange={(e) => handleDimensionChange(item.id, 'width', e.target.value)}
                        onBlur={() => handleDimensionBlur(item.id, 'width')}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Altura (m)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="bg-slate-900 border border-slate-800 p-2.5 sm:p-2 rounded-lg text-xs text-white w-full font-mono"
                        value={getDimensionDisplay(item.id, 'height', item.height)}
                        placeholder="0,00"
                        onChange={(e) => handleDimensionChange(item.id, 'height', e.target.value)}
                        onBlur={() => handleDimensionBlur(item.id, 'height')}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <label className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Dificuldade</label>
                      <select
                        className="bg-slate-900 border border-slate-800 p-2.5 sm:p-2 rounded-lg text-[10px] text-white w-full font-bold uppercase tracking-tight"
                        value={item.complexity}
                        onChange={(e) => updateItem(item.id, { complexity: parseInt(e.target.value) as any })}
                      >
                        <option value={1}>Fácil (Plano)</option>
                        <option value={2}>Médio (Curvas)</option>
                        <option value={3}>Alto (Cantos/Puxadores)</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </div>
          </section>

          {selectedMaterialId && nestingParts.length > 0 && (
            <div className={cn(wizard.stepPanelClass(3))}>
              {rollDimensions ? (
                <RollNestingPreview
                  accent="emerald"
                  rollWidth={rollDimensions.width}
                  rollLength={rollDimensions.length}
                  parts={nestingParts}
                  materialLabel={selectedMaterial?.name}
                />
              ) : (
                <section className="bg-slate-900/50 border border-amber-500/20 rounded-2xl p-6 flex gap-4 items-start">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-amber-200">Dimensões do rolo não disponíveis</h3>
                    <p className="text-xs text-amber-200/70 mt-1">
                      Este material não possui largura e comprimento do rolo cadastrados. Reimporte a planilha
                      &quot;Materiais e aplicações.xlsx&quot; com as colunas &quot;Larguras Disponíveis (m)&quot; e
                      &quot;Comprimento do Rolo (m)&quot; para visualizar o encaixe das peças.
                    </p>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <div
          className={cn(
            'space-y-6',
            wizard.activeStep === 2 ? 'order-1 lg:order-none' : 'order-2',
          )}
        >
          <BudgetCollapsibleMaterialPanel
            accent="emerald"
            step={3}
            title="Material"
            description="Escolha o vinil e as dimensões do rolo."
            panelClassName={cn(
              mobileStepPanelClass('emerald', wizard.stepPanelClass(2)),
              'lg:bg-slate-900 lg:border-emerald-500/30 lg:shadow-2xl lg:shadow-emerald-900/10',
            )}
            selectedMaterial={selectedMaterial}
            alwaysExpanded={isMaterialStepActive}
            isExpanded={materialExpanded}
            onToggle={() => setMaterialExpanded((v) => !v)}
          >
              <MaterialCascadeSelect
                materials={materials}
                context={materialContext}
                selectedMaterialId={selectedMaterialId}
                onSelectMaterialId={setSelectedMaterialId}
                onSelectionChange={() => setCustomPricePerM2(null)}
                accent="emerald"
              />

              <MaterialRollDimensionSelect
                material={selectedMaterial}
                selectedWidth={selectedRollWidth}
                selectedLength={selectedRollLength}
                onSelectWidth={setSelectedRollWidth}
                onSelectLength={setSelectedRollLength}
                accent="emerald"
              />

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Valor por m² (Personalizar)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customPricePerM2 ?? (selectedMaterial?.pricePerM2 || 0)}
                    onChange={(e) => setCustomPricePerM2(parseFloat(e.target.value))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-emerald-400 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <Zap size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50" />
                </div>
                {customPricePerM2 !== null && (
                  <button
                    onClick={() => setCustomPricePerM2(null)}
                    className="text-[9px] text-emerald-400 underline hover:text-emerald-300 ml-1"
                  >
                    Restaurar valor do sistema
                  </button>
                )}
              </div>

              {selectedMaterialId && selectedMaterial && (
                <div
                  className={cn(
                    'pt-4 border-t border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-4',
                    isRecommended ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20',
                  )}
                >
                  <div className="w-14 h-14 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 shrink-0">
                    <Package className={cn(isRecommended ? 'text-emerald-500' : 'text-amber-500')} size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <h4 className="font-bold text-white truncate">{selectedMaterial.name}</h4>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0',
                          isRecommended ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400',
                        )}
                      >
                        {isRecommended ? 'Recomendado' : 'Atenção'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {selectedMaterial.brand} • {selectedMaterial.line}
                    </p>
                  </div>
                </div>
              )}
          </BudgetCollapsibleMaterialPanel>

          <section
            id="budget-summary"
            className={cn(
              mobileStepPanelClass('emerald', wizard.stepPanelClass(3)),
              'lg:bg-slate-900 lg:border-emerald-500/30 lg:shadow-2xl lg:shadow-emerald-900/10',
            )}
          >
            <BudgetMobileStepHeader
              step={4}
              title="Revisar e salvar"
              description="Confira valores antes de gerar o PDF."
              accent="emerald"
            />
            <h3 className="hidden lg:flex text-lg font-bold text-white mb-6 items-center gap-2">
              <LayoutDashboard className="text-emerald-500" size={20} />
              Resumo do Projeto
            </h3>

            <div className="space-y-6">
              <div className="space-y-4">
                  {totals.hasRollPricing ? (
                    <>
                      <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                        <span className="text-slate-400 italic leading-snug">Comprimento usado no rolo</span>
                        <span className="font-mono text-white shrink-0">{totals.usedLength.toFixed(2)} m</span>
                      </div>
                      <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                        <span className="text-slate-400 italic leading-snug">Área usada no rolo</span>
                        <span className="font-mono text-white shrink-0">{totals.rollAreaM2.toFixed(2)} m²</span>
                      </div>
                      <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                        <span className="text-slate-400 italic leading-snug pr-0 sm:pr-4">
                          Material faturado (usado + {Math.round((ROLL_WASTE_FACTOR - 1) * 100)}%)
                        </span>
                        <span className="font-mono text-emerald-300 font-bold shrink-0">{totals.finalM2.toFixed(2)} m²</span>
                      </div>
                    </>
                  ) : selectedMaterialId && nestingParts.length > 0 ? (
                    <p className="text-[10px] text-amber-400/90 italic leading-snug">
                      Cadastre largura e comprimento do rolo no material para calcular o consumo (usado + 15%).
                    </p>
                  ) : null}
                  <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-sm border-t border-slate-800/50 pt-2">
                    <span className="text-slate-400 font-bold leading-snug">Mão de Obra</span>
                    <span className="font-mono text-emerald-400 font-bold shrink-0">{totals.hours.toFixed(1)} hrs</span>
                  </div>
              </div>

              <div className="bg-emerald-600/10 border border-emerald-500/20 p-5 rounded-2xl shadow-inner text-center hidden lg:block">
                <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1 font-bold">Total Sugerido</p>
                <h4 className="text-4xl font-black text-white tracking-tighter">
                  {formatCurrency(totals.price)}
                </h4>
              </div>

              <BudgetMobileTotalHero total={totals.price} label="Total sugerido" accent="emerald" />

              {selectedMaterial && (
                <SupplierWhatsAppButton
                  brand={selectedMaterial.brand}
                  line={getMaterialProductLine(selectedMaterial)}
                  variant="primary"
                  messageContext={{
                    customerName: customerName || 'Cliente',
                    projectLabel: selectedAppliance
                      ? `${subType}: ${selectedAppliance.make} ${selectedAppliance.model}`
                      : subType,
                    brand: selectedMaterial.brand,
                    line: getMaterialProductLine(selectedMaterial),
                    areaM2: totals.finalM2,
                    totalPrice: totals.price,
                    budgetType: 'Decorativo',
                  }}
                />
              )}

              <BudgetSavePdfActions
                saveDisabled={!canExportBudget}
                pdfDisabled={!canExportBudget}
                isBudgetSaved={isBudgetSaved}
                onSave={handleSave}
                onGeneratePDF={handleGeneratePDF}
                accent="emerald"
                onSaveBlocked={() => {
                  const msg = getExportValidationMessage();
                  if (msg) showNotice(msg, 'warning');
                }}
                onPdfBlocked={() => {
                  const msg = getExportValidationMessage();
                  if (msg) showNotice(msg, 'warning');
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
