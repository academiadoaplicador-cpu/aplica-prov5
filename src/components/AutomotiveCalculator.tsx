import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Car,
  Search,
  AlertCircle,
  Package,
  Zap,
  LayoutDashboard,
  ChevronDown,
  Info,
  AlertTriangle,
  History,
} from 'lucide-react';
import {
  getMissingMeasurementParts,
  getPartInfo,
  getVehiclePartsWithMeasurementStatus,
  getVehiclePartsWithMeasurements,
  hasPartMeasurement,
  isVehicleMeasurementsComplete,
} from '../utils/vehiclePartsUtils';
import { VehicleSize, BudgetPiece, Budget, FinancialSettings, Material, Vehicle } from '../types';
import { databaseService } from '../services/databaseService';
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
import { getMaterialRollDimensions } from '../utils/materialRoll';
import { computeRollMaterialUsage, ROLL_WASTE_FACTOR } from '../utils/rollNesting';
import type { NestingPartInput } from '../utils/rollNesting';
import { getMaterialProductLine } from '../utils/materialSelection';
import SupplierWhatsAppButton from './SupplierWhatsAppButton';
import BudgetNotice from './budget-mobile/BudgetNotice';
import { useBudgetNotice } from '../hooks/useBudgetNotice';
import {
  clearAutomotiveBudgetDraft,
  loadAutomotiveBudgetDraft,
  saveAutomotiveBudgetDraft,
} from '../utils/budgetDraftStorage';
import { useBudgetDraftPersistence } from '../hooks/useBudgetDraftPersistence';

export default function AutomotiveCalculator() {
  const restoredDraft = useRef(loadAutomotiveBudgetDraft());
  const isRestoringDraftRef = useRef(Boolean(restoredDraft.current));

  const [customerName, setCustomerName] = useState(restoredDraft.current?.customerName ?? '');
  const [selectedMake, setSelectedMake] = useState(restoredDraft.current?.selectedMake ?? '');
  const [selectedModel, setSelectedModel] = useState(restoredDraft.current?.selectedModel ?? '');
  const [selectedYear, setSelectedYear] = useState(restoredDraft.current?.selectedYear ?? '');
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    restoredDraft.current?.selectedVehicleId ?? '',
  );
  const [vehicleQuantity, setVehicleQuantity] = useState(
    Math.max(1, restoredDraft.current?.vehicleQuantity ?? 1),
  );
  const [budgetType, setBudgetType] = useState<'Completo' | 'Parcial'>(
    restoredDraft.current?.budgetType ?? 'Completo',
  );
  const [selectedPieces, setSelectedPieces] = useState<string[]>(
    restoredDraft.current?.selectedPieces ?? [],
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<FinancialSettings>({
    hourlyRate: 50,
    profitMarginPercentage: 30,
    taxPercentage: 6,
    fixedCosts: 1500,
  });

  const isAdmin = databaseService.getCachedUser()?.isAdmin ?? false;

  useEffect(() => {
    Promise.all([
      databaseService.getVehicles(),
      databaseService.getMaterials(),
      databaseService.getFinancialSettings(),
    ]).then(([v, m, s]) => {
      setVehicles(v);
      setMaterials(m);
      setSettings(s);
    });
  }, []);

  // Filter options for 3-level select
  const makes = useMemo(() => Array.from(new Set(vehicles.map(v => v.make))), [vehicles]);
  const models = useMemo(() => {
    if (!selectedMake) return [];
    return Array.from(new Set(vehicles.filter(v => v.make === selectedMake).map(v => v.model)));
  }, [selectedMake, vehicles]);
  const years = useMemo(() => {
    if (!selectedMake || !selectedModel) return [];
    return vehicles.filter(v => v.make === selectedMake && v.model === selectedModel).map(v => v.year);
  }, [selectedMake, selectedModel, vehicles]);

  // Sync selectedVehicleId when 3 levels are chosen
  useEffect(() => {
    const vehicle = vehicles.find(v => v.make === selectedMake && v.model === selectedModel && v.year === selectedYear);
    if (vehicle) {
      setSelectedVehicleId(vehicle.id);
    } else {
      setSelectedVehicleId('');
    }
  }, [selectedMake, selectedModel, selectedYear, vehicles]);

  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId), 
    [selectedVehicleId, vehicles]
  );

  const isComplete = useMemo(
    () => (selectedVehicle ? isVehicleMeasurementsComplete(selectedVehicle) : false),
    [selectedVehicle],
  );

  const partialPartsList = useMemo(
    () => (selectedVehicle ? getVehiclePartsWithMeasurementStatus(selectedVehicle) : []),
    [selectedVehicle],
  );

  const missingMeasurementParts = useMemo(
    () => (selectedVehicle ? getMissingMeasurementParts(selectedVehicle) : []),
    [selectedVehicle],
  );

  // Ao escolher o veículo, inicia em Completo (Parcial só se o usuário clicar)
  useEffect(() => {
    if (isRestoringDraftRef.current) return;
    if (!selectedVehicleId) {
      setSelectedPieces([]);
      return;
    }
    setBudgetType('Completo');
  }, [selectedVehicleId]);

  // Completo: marca todas as peças do preset
  useEffect(() => {
    if (isRestoringDraftRef.current) return;
    if (budgetType === 'Completo' && selectedVehicle) {
      setSelectedPieces(getVehiclePartsWithMeasurements(selectedVehicle).map((p) => p.id));
    }
  }, [budgetType, selectedVehicle]);

  const handleBudgetType = (type: 'Completo' | 'Parcial') => {
    setBudgetType(type);
    if (type === 'Parcial') {
      setSelectedPieces([]);
    }
  };

  const togglePiece = (id: string) => {
    if (budgetType === 'Completo') return;
    if (!selectedVehicle) return;
    const part = partialPartsList.find((p) => p.id === id);
    if (!part?.hasMeasurement) return;
    setSelectedPieces(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const prevMaterialIdRef = useRef(selectedMaterialId);
  useEffect(() => {
    if (!selectedMaterialId) setMaterialExpanded(true);
    prevMaterialIdRef.current = selectedMaterialId;
  }, [selectedMaterialId]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const isRecommended = selectedMaterial?.recommendedFor.includes('Automotivo');

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

  const nestingPartsPerVehicle = useMemo((): NestingPartInput[] => {
    if (!selectedVehicle) return [];
    return selectedPieces
      .map((partId) => {
        if (!hasPartMeasurement(selectedVehicle, partId)) return null;
        const part = getPartInfo(partId, selectedVehicle);
        const m = selectedVehicle.partMeasurements[partId]!;
        return {
          id: part.id,
          name: part.name,
          width: m.width,
          length: m.length,
        };
      })
      .filter((p): p is NestingPartInput => p !== null);
  }, [selectedVehicle, selectedPieces]);

  const totals = useMemo(() => {
    const empty = {
      usedLength: 0,
      usedLengthPerVehicle: 0,
      rollAreaM2: 0,
      materialM2: 0,
      rollsNeeded: 1,
      hasRollPricing: false,
      hours: 0,
      cost: 0,
      price: 0,
      profit: 0,
    };

    if (!selectedVehicle) return empty;

    const pieces = selectedPieces.map((id) => getPartInfo(id, selectedVehicle));
    const totalDifficulty = pieces.reduce((acc, p) => acc + p.difficulty, 0);
    const estimatedHours = totalDifficulty * 0.75 * vehicleQuantity;

    const material = materials.find(m => m.id === selectedMaterialId);
    const pricePerM2 = customPricePerM2 ?? (material?.pricePerM2 || 0);

    let usedLength = 0;
    let rollAreaM2 = 0;
    let materialM2 = 0;
    let hasRollPricing = false;

    if (rollDimensions && nestingPartsPerVehicle.length > 0) {
      const usage = computeRollMaterialUsage(
        nestingPartsPerVehicle,
        rollDimensions.width,
        rollDimensions.length,
        { vehicleQuantity },
      );
      usedLength = usage.usedLength;
      rollAreaM2 = usage.rollAreaM2;
      materialM2 = usage.materialM2;
      hasRollPricing = true;
    }

    const usedLengthPerVehicle =
      vehicleQuantity > 0 ? usedLength / vehicleQuantity : 0;
    const rollsNeeded =
      rollDimensions && rollDimensions.length > 0
        ? Math.max(1, Math.ceil(usedLength / rollDimensions.length))
        : 1;

    const materialCost = materialM2 * pricePerM2;
    const laborCost = estimatedHours * settings.hourlyRate;

    const baseCost = materialCost + laborCost;
    const totalPrice = baseCost * (1 + (settings.profitMarginPercentage / 100)) * (1 + (settings.taxPercentage / 100));
    const profit = totalPrice - baseCost - (totalPrice * (settings.taxPercentage / 100));

    return {
      usedLength,
      usedLengthPerVehicle,
      rollAreaM2,
      materialM2,
      rollsNeeded,
      hasRollPricing,
      hours: estimatedHours,
      cost: baseCost,
      price: totalPrice,
      profit,
    };
  }, [
    selectedVehicle,
    selectedPieces,
    vehicleQuantity,
    nestingPartsPerVehicle,
    rollDimensions,
    selectedMaterialId,
    customPricePerM2,
    materials,
    settings,
  ]);

  const currentBudget = useMemo(() => ({
    id: generateId(),
    customerName,
    vehicleModel: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.year})` : '',
    vehicleId: selectedVehicleId,
    vehicleQuantity: vehicleQuantity > 1 ? vehicleQuantity : undefined,
    rollsNeeded: totals.rollsNeeded > 1 ? totals.rollsNeeded : undefined,
    status: 'Pendente' as const,
    date: new Date().toISOString(),
    items: selectedPieces.map(p => ({ partId: p, quantity: 1 })),
    materialId: selectedMaterialId,
    customPricePerM2: customPricePerM2 || undefined,
    totalHours: totals.hours,
    totalMaterialMeters: totals.usedLength,
    totalMaterialM2: totals.materialM2,
    totalCost: totals.cost,
    totalPrice: totals.price,
    profit: totals.profit,
    type: 'Automotivo' as const
  }), [customerName, selectedVehicle, selectedVehicleId, vehicleQuantity, selectedPieces, selectedMaterialId, customPricePerM2, totals]);

  const budgetSnapshot = useMemo(
    () =>
      JSON.stringify({
        customerName,
        selectedVehicleId,
        vehicleQuantity,
        budgetType,
        selectedPieces: [...selectedPieces].sort(),
        selectedMaterialId,
        customPricePerM2,
        selectedRollWidth,
        selectedRollLength,
      }),
    [
      customerName,
      selectedVehicleId,
      vehicleQuantity,
      budgetType,
      selectedPieces,
      selectedMaterialId,
      customPricePerM2,
      selectedRollWidth,
      selectedRollLength,
    ],
  );

  const isBudgetSaved = savedSnapshot === budgetSnapshot;

  const getExportValidationMessage = useCallback((): string | null => {
    if (!customerName.trim()) return 'Informe o nome do cliente.';
    if (!selectedVehicleId) return 'Selecione fabricante, modelo e ano do veículo.';
    if (selectedPieces.length === 0) return 'Selecione ao menos uma peça para o orçamento.';
    if (!selectedMaterialId) return 'Selecione o material antes de salvar ou gerar o PDF.';
    return null;
  }, [customerName, selectedVehicleId, selectedPieces.length, selectedMaterialId]);

  const getStepValidationMessage = useCallback(
    (stepIndex: number): string | null => {
      switch (stepIndex) {
        case 0:
          if (!customerName.trim()) return 'Informe o nome do cliente.';
          if (!selectedVehicleId) return 'Selecione fabricante, modelo e ano do veículo.';
          return null;
        case 1:
          if (selectedPieces.length === 0) {
            return budgetType === 'Parcial'
              ? 'Selecione ao menos uma peça para incluir no orçamento.'
              : 'Nenhuma peça com medida disponível para este veículo.';
          }
          return null;
        case 2:
          if (!selectedMaterialId) return 'Selecione o material para continuar.';
          return null;
        default:
          return getExportValidationMessage();
      }
    },
    [
      customerName,
      selectedVehicleId,
      selectedPieces.length,
      budgetType,
      selectedMaterialId,
      getExportValidationMessage,
    ],
  );

  const handleSave = async (): Promise<boolean> => {
    const validationError = getExportValidationMessage();
    if (validationError) {
      showNotice(validationError, 'warning');
      return false;
    }
    await databaseService.saveBudget(currentBudget);
    clearAutomotiveBudgetDraft();
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

  const canExportBudget = !getExportValidationMessage();

  const flowSteps = useMemo((): BudgetFlowStep[] => [
    {
      id: 'cliente',
      label: 'Informe o cliente e selecione o veículo',
      shortLabel: 'Cliente',
      complete: Boolean(customerName.trim() && selectedVehicleId),
    },
    {
      id: 'pecas',
      label: 'Escolha completo ou parcial e selecione as peças',
      shortLabel: 'Peças',
      complete: selectedPieces.length > 0,
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
  ], [customerName, selectedVehicleId, selectedPieces.length, selectedMaterialId, canExportBudget]);

  const wizard = useBudgetWizard(flowSteps, restoredDraft.current?.activeStep ?? 0);

  const materialContext = useMemo(() => ({ mode: 'automotive' as const }), []);

  const isMaterialStepActive = wizard.activeStep === 2;

  const tryGoNext = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
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
      selectedMake,
      selectedModel,
      selectedYear,
      selectedVehicleId,
      vehicleQuantity,
      budgetType,
      selectedPieces,
      selectedMaterialId,
      customPricePerM2,
      selectedRollWidth,
      selectedRollLength,
      activeStep: wizard.activeStep,
    }),
    () =>
      Boolean(
        customerName.trim() ||
          selectedVehicleId ||
          selectedMaterialId ||
          selectedPieces.length > 0,
      ),
    saveAutomotiveBudgetDraft,
    clearAutomotiveBudgetDraft,
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
        accent="indigo"
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
      <BudgetNotice notice={notice} onDismiss={clearNotice} accent="indigo" />
      <div className="hidden lg:block">
        <PageHeader
          title="Automotivo"
          description="Monte orçamentos com veículos e materiais do catálogo"
        />
      </div>

      <BudgetFlowStepper
        steps={flowSteps}
        activeStep={wizard.activeStep}
        onStepChange={tryGoToStep}
        canGoToStep={wizard.canGoToStep}
        accent="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 lg:items-start">
        <div
          className={cn(
            'space-y-6 lg:col-span-2',
            wizard.activeStep === 2 ? 'order-2 lg:order-none' : 'order-1',
          )}
        >
          <section
            className={cn(
              mobileStepPanelClass('indigo', wizard.stepPanelClass(0)),
              'space-y-6 shadow-sm',
            )}
          >
            <BudgetMobileStepHeader
              step={1}
              title="Cliente e veículo"
              description="Quem é o cliente e qual carro será envelopado?"
              accent="indigo"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
              <div className="space-y-2">
                <label className={mobileFieldLabel}>Cliente</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    className={cn(mobileFieldInput, 'focus:ring-indigo-500 pr-11')}
                  />
                  <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-3">
                <label className={mobileFieldLabel}>Veículo</label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                  <div className="relative min-w-0">
                    <select 
                      value={selectedMake}
                      title={selectedMake || undefined}
                      onChange={(e) => {
                        setSelectedMake(e.target.value);
                        setSelectedModel('');
                        setSelectedYear('');
                      }}
                      className={cn(mobileSelectInput, 'focus:ring-indigo-500 sm:text-sm')}
                    >
                      <option value="">Marca</option>
                      {makes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                  <div className="relative min-w-0">
                    <select 
                      value={selectedModel}
                      title={selectedModel || undefined}
                      disabled={!selectedMake}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setSelectedYear('');
                      }}
                      className={cn(mobileSelectInput, 'focus:ring-indigo-500 sm:text-sm disabled:opacity-30')}
                    >
                      <option value="">Modelo</option>
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                  <div className="relative min-w-0">
                    <select 
                      value={selectedYear}
                      title={selectedYear || undefined}
                      disabled={!selectedModel}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className={cn(mobileSelectInput, 'focus:ring-indigo-500 sm:text-sm disabled:opacity-30')}
                    >
                      <option value="">Ano</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
              </div>
              {selectedVehicleId && (
                <div className="space-y-2 md:col-span-2">
                  <label className={mobileFieldLabel}>Quantidade de veículos</label>
                  <div className="flex items-center gap-2 w-full sm:max-w-xs">
                    <button
                      type="button"
                      onClick={() => setVehicleQuantity((current) => Math.max(1, current - 1))}
                      disabled={vehicleQuantity <= 1}
                      className={cn(
                        mobileFieldInput,
                        'min-h-11 min-w-11 w-11 shrink-0 text-center font-bold text-lg px-0 disabled:opacity-30',
                      )}
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={vehicleQuantity}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        if (!Number.isFinite(parsed)) {
                          setVehicleQuantity(1);
                          return;
                        }
                        setVehicleQuantity(Math.max(1, Math.min(999, parsed)));
                      }}
                      className={cn(mobileFieldInput, 'flex-1 min-w-0 text-center font-mono font-bold')}
                      aria-label="Quantidade de veículos"
                    />
                    <button
                      type="button"
                      onClick={() => setVehicleQuantity((current) => Math.min(999, current + 1))}
                      disabled={vehicleQuantity >= 999}
                      className={cn(
                        mobileFieldInput,
                        'min-h-11 min-w-11 w-11 shrink-0 text-center font-bold text-lg px-0 disabled:opacity-30',
                      )}
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 italic leading-snug">
                    Repete o mesmo modelo e as mesmas peças no orçamento (ex.: frota com 20 unidades).
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-4 pt-4 border-t border-slate-800/80">
               <button
                  type="button"
                  disabled={!selectedVehicleId}
                  onClick={() => handleBudgetType('Completo')}
                  className={cn(
                    "w-full sm:flex-1 min-h-[4.5rem] sm:min-h-0 sm:p-4 p-4 rounded-2xl border font-bold text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98]",
                    budgetType === 'Completo' ? "bg-indigo-600/15 border-indigo-500/60 text-indigo-300 shadow-lg shadow-indigo-900/25 ring-1 ring-indigo-500/20" : "bg-slate-950/80 border-slate-800 text-slate-500",
                    !selectedVehicleId && "opacity-30 cursor-not-allowed",
                  )}
               >
                 <Car size={20} className="shrink-0" /> Completo
                 {!isComplete && selectedVehicleId && (
                   <Info size={12} className="ml-1" title="Algumas medidas do veículo estão incompletas no cadastro" />
                 )}
               </button>
               <button
                  type="button"
                  disabled={!selectedVehicleId}
                  onClick={() => handleBudgetType('Parcial')}
                  className={cn(
                    "w-full sm:flex-1 min-h-[4.5rem] sm:min-h-0 sm:p-4 p-4 rounded-2xl border font-bold text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98]",
                    budgetType === 'Parcial' ? "bg-indigo-600/15 border-indigo-500/60 text-indigo-300 shadow-lg shadow-indigo-900/25 ring-1 ring-indigo-500/20" : "bg-slate-950/80 border-slate-800 text-slate-500",
                    !selectedVehicleId && "opacity-30 cursor-not-allowed",
                  )}
               >
                 <History size={20} className="shrink-0" /> Parcial
               </button>
            </div>
          </section>

          <section
            className={cn(
              mobileStepPanelClass('indigo', wizard.stepPanelClass(1)),
              budgetType === 'Completo' && 'lg:hidden',
              'space-y-5',
            )}
          >
            <BudgetMobileStepHeader
              step={2}
              title="Peças do orçamento"
              description={
                budgetType === 'Parcial'
                  ? 'Toque nas peças que entram neste orçamento.'
                  : 'Confira o que foi incluído automaticamente.'
              }
              accent="indigo"
            />

            {budgetType === 'Parcial' && selectedVehicle && (
              <>
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500">
                    Seleção parcial
                  </h3>
                  <p className="text-[10px] text-slate-600 mt-1 italic">
                    Peças cadastradas para este veículo — só é possível orçar as que têm medida preenchida.
                  </p>
                </div>

                {missingMeasurementParts.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-xs font-bold text-amber-200">
                          {missingMeasurementParts.length} peça
                          {missingMeasurementParts.length > 1 ? 's' : ''} sem medida neste veículo
                        </p>
                        <p className="text-[10px] text-amber-200/70 mt-1">
                          {isAdmin
                            ? 'Cadastre na base de veículos ou importe a planilha para incluir no orçamento.'
                            : 'Estas peças não podem ser incluídas no orçamento para este veículo.'}
                        </p>
                      </div>
                    </div>
                    <ul className="flex flex-wrap gap-1.5 pl-6">
                      {missingMeasurementParts.map((part) => (
                        <li
                          key={part.id}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-500/25 text-amber-300"
                        >
                          {part.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {partialPartsList.length === 0 ? (
                  <p className="text-sm text-amber-200/80 italic rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                    {isAdmin
                      ? 'Este veículo ainda não tem peças cadastradas. Adicione na base de veículos antes de montar o orçamento.'
                      : 'Este veículo ainda não tem peças com medida cadastradas.'}
                  </p>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                  {partialPartsList.map((part) => {
                    const isSelected = selectedPieces.includes(part.id);
                    const canSelect = part.hasMeasurement;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        disabled={!canSelect}
                        onClick={() => togglePiece(part.id)}
                        className={cn(
                          'p-4 rounded-2xl border transition-all text-left group flex flex-col gap-2 min-h-[5rem] active:scale-[0.98]',
                          !canSelect &&
                            'bg-slate-950/80 border-amber-500/30 text-amber-200/60 cursor-not-allowed opacity-80',
                          canSelect &&
                            isSelected &&
                            'bg-indigo-600/10 border-indigo-500/50 text-indigo-200',
                          canSelect &&
                            !isSelected &&
                            'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700',
                        )}
                      >
                        <div className="flex items-start justify-between gap-1 w-full">
                          <span className="text-[11px] font-bold uppercase tracking-tight leading-tight">
                            {part.name}
                          </span>
                          {canSelect && isSelected && (
                            <Zap size={12} className="text-indigo-400 fill-indigo-400 shrink-0" />
                          )}
                        </div>
                        {!canSelect && (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/90">
                            Sem medida
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                )}
              </>
            )}

            {budgetType === 'Completo' && selectedVehicleId && (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-600/10 px-5 py-5 space-y-2 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <Zap size={18} className="text-indigo-400" />
                  </div>
                  <p className="text-base font-bold text-indigo-100">Orçamento completo</p>
                </div>
                <p className="text-sm text-indigo-200/80 pl-[3.25rem]">
                  {selectedPieces.length} peças com medida incluídas automaticamente.
                </p>
              </div>
            )}

            {!selectedVehicleId && (
              <p className="text-sm text-slate-500 italic lg:hidden">
                Volte à etapa anterior e selecione um veículo.
              </p>
            )}
          </section>

          {selectedVehicleId && selectedMaterialId && nestingPartsPerVehicle.length > 0 && (
            <div className={cn(wizard.stepPanelClass(3))}>
              {rollDimensions ? (
                <RollNestingPreview
                  rollWidth={rollDimensions.width}
                  rollLength={rollDimensions.length}
                  parts={nestingPartsPerVehicle}
                  vehicleQuantity={vehicleQuantity}
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
            accent="indigo"
            step={3}
            title="Material"
            description="Escolha o vinil e as dimensões do rolo."
            panelClassName={cn(
              mobileStepPanelClass('indigo', wizard.stepPanelClass(2)),
              'lg:bg-slate-900 lg:border-indigo-500/30 lg:shadow-2xl lg:shadow-indigo-900/20',
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
                accent="indigo"
              />

              <MaterialRollDimensionSelect
                material={selectedMaterial}
                selectedWidth={selectedRollWidth}
                selectedLength={selectedRollLength}
                onSelectWidth={setSelectedRollWidth}
                onSelectLength={setSelectedRollLength}
                accent="indigo"
              />

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Preço por m² (Override)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customPricePerM2 ?? (selectedMaterial?.pricePerM2 || 0)}
                    onChange={(e) => setCustomPricePerM2(parseFloat(e.target.value))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-white focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <Zap size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500/50" />
                </div>
                {customPricePerM2 !== null && (
                  <button
                    onClick={() => setCustomPricePerM2(null)}
                    className="text-[9px] text-indigo-400 underline hover:text-indigo-300 ml-1"
                  >
                    Restaurar preço do catálogo
                  </button>
                )}
              </div>

              {selectedMaterialId && selectedMaterial && (
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
                  <div className="w-14 h-14 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 shrink-0">
                    <Package className="text-indigo-500" size={22} />
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
              mobileStepPanelClass('indigo', wizard.stepPanelClass(3)),
              'lg:bg-slate-900 lg:border-indigo-500/30 lg:shadow-2xl lg:shadow-indigo-900/20',
            )}
          >
            <BudgetMobileStepHeader
              step={4}
              title="Revisar e salvar"
              description="Confira valores antes de gerar o PDF."
              accent="indigo"
            />
            <h3 className="hidden lg:flex text-lg font-bold text-white mb-6 items-center gap-2">
              <LayoutDashboard className="text-indigo-500" size={20} />
              Resumo do Orçamento
            </h3>

            <div className="space-y-6">
              <div className="space-y-3">
                  {vehicleQuantity > 1 && (
                    <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                      <span className="text-slate-400 italic leading-snug">Quantidade de veículos</span>
                      <span className="font-mono text-white font-bold shrink-0">{vehicleQuantity}×</span>
                    </div>
                  )}
                  {totals.hasRollPricing ? (
                    <>
                      {vehicleQuantity > 1 && (
                        <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                          <span className="text-slate-400 italic leading-snug">Comprimento por veículo</span>
                          <span className="font-mono text-white shrink-0">{totals.usedLengthPerVehicle.toFixed(2)} m</span>
                        </div>
                      )}
                      <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                        <span className="text-slate-400 italic leading-snug">
                          {vehicleQuantity > 1 ? 'Comprimento total no rolo' : 'Comprimento usado no rolo'}
                        </span>
                        <span className="font-mono text-white shrink-0">{totals.usedLength.toFixed(2)} m</span>
                      </div>
                      {totals.rollsNeeded > 1 && (
                        <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                          <span className="text-slate-400 italic leading-snug">Rolos necessários</span>
                          <span className="font-mono text-amber-300 font-bold shrink-0">{totals.rollsNeeded}×</span>
                        </div>
                      )}
                      <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                        <span className="text-slate-400 italic leading-snug">Área usada no rolo</span>
                        <span className="font-mono text-white shrink-0">{totals.rollAreaM2.toFixed(2)} m²</span>
                      </div>
                      <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                        <span className="text-slate-400 italic leading-snug pr-0 sm:pr-4">
                          Material faturado (usado + {Math.round((ROLL_WASTE_FACTOR - 1) * 100)}%)
                        </span>
                        <span className="font-mono text-indigo-300 font-bold shrink-0">{totals.materialM2.toFixed(2)} m²</span>
                      </div>
                    </>
                  ) : selectedMaterialId && nestingPartsPerVehicle.length > 0 ? (
                    <p className="text-[10px] text-amber-400/90 italic leading-snug">
                      Cadastre largura e comprimento do rolo no material para calcular o consumo (usado + 15%).
                    </p>
                  ) : null}
                  <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:justify-between sm:items-center text-sm border-t border-slate-800/50 pt-2">
                    <span className="text-slate-400 leading-snug">Prazos e Mão de Obra</span>
                    <span className="font-mono text-indigo-400 font-bold shrink-0">{totals.hours.toFixed(1)} hrs</span>
                  </div>
              </div>

              {!isRecommended && selectedMaterialId && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                  <p className="text-[10px] text-amber-200/70 italic">Alerta: Este material não tem recomendação direta de fábrica para esta finalidade.</p>
                </div>
              )}

              <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-xl shadow-inner hidden lg:block">
                <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1 text-center font-bold">Investimento Sugerido</p>
                <h4 className="text-4xl font-black text-white text-center tracking-tighter">
                  {formatCurrency(totals.price)}
                </h4>
              </div>

              <BudgetMobileTotalHero total={totals.price} accent="indigo" />

              {selectedMaterial && (
                <SupplierWhatsAppButton
                  brand={selectedMaterial.brand}
                  line={getMaterialProductLine(selectedMaterial)}
                  variant="primary"
                  messageContext={{
                    customerName: customerName || 'Cliente',
                    projectLabel:
                      selectedVehicle
                        ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.year}${vehicleQuantity > 1 ? ` (${vehicleQuantity} un.)` : ''}`
                        : 'Veículo',
                    brand: selectedMaterial.brand,
                    line: getMaterialProductLine(selectedMaterial),
                    areaM2: totals.materialM2,
                    totalPrice: totals.price,
                    budgetType: 'Automotivo',
                  }}
                />
              )}

              <BudgetSavePdfActions
                saveDisabled={!canExportBudget}
                pdfDisabled={!canExportBudget}
                isBudgetSaved={isBudgetSaved}
                onSave={handleSave}
                onGeneratePDF={handleGeneratePDF}
                accent="indigo"
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
