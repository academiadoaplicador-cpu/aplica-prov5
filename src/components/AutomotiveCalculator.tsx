import { useState, useMemo, useEffect } from 'react';
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
import { VEHICLE_PARTS_DATA, VEHICLE_PRESETS } from '../types/vehicleParts';
import {
  getMissingMeasurementParts,
  getVehiclePartsWithMeasurementStatus,
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
export default function AutomotiveCalculator() {
  const [customerName, setCustomerName] = useState('');
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [budgetType, setBudgetType] = useState<'Completo' | 'Parcial'>('Completo');
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [customPricePerM2, setCustomPricePerM2] = useState<number | null>(null);
  const [selectedRollWidth, setSelectedRollWidth] = useState<number | null>(null);
  const [selectedRollLength, setSelectedRollLength] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
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
    if (!selectedVehicleId) {
      setSelectedPieces([]);
      return;
    }
    setBudgetType('Completo');
  }, [selectedVehicleId]);

  // Completo: marca todas as peças do preset
  useEffect(() => {
    if (budgetType === 'Completo' && selectedVehicle) {
      setSelectedPieces(VEHICLE_PRESETS[selectedVehicle.size] || []);
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

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const isRecommended = selectedMaterial?.recommendedFor.includes('Automotivo');

  useEffect(() => {
    setSelectedRollWidth(null);
    setSelectedRollLength(null);
  }, [selectedMaterialId]);

  const rollDimensions = useMemo(
    () =>
      getMaterialRollDimensions(selectedMaterial, {
        width: selectedRollWidth ?? undefined,
        length: selectedRollLength ?? undefined,
      }),
    [selectedMaterial, selectedRollWidth, selectedRollLength],
  );

  const nestingParts = useMemo((): NestingPartInput[] => {
    if (!selectedVehicle) return [];
    return VEHICLE_PARTS_DATA.filter((p) => selectedPieces.includes(p.id))
      .map((part) => {
        const m = selectedVehicle.partMeasurements[part.id];
        if (!m || m.width <= 0 || m.length <= 0) return null;
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
      rollAreaM2: 0,
      materialM2: 0,
      hasRollPricing: false,
      hours: 0,
      cost: 0,
      price: 0,
      profit: 0,
    };

    if (!selectedVehicle) return empty;

    const pieces = VEHICLE_PARTS_DATA.filter((p) => selectedPieces.includes(p.id));
    const totalDifficulty = pieces.reduce((acc, p) => acc + p.difficulty, 0);
    const estimatedHours = totalDifficulty * 0.75;

    const material = materials.find(m => m.id === selectedMaterialId);
    const pricePerM2 = customPricePerM2 ?? (material?.pricePerM2 || 0);

    let usedLength = 0;
    let rollAreaM2 = 0;
    let materialM2 = 0;
    let hasRollPricing = false;

    if (rollDimensions && nestingParts.length > 0) {
      const usage = computeRollMaterialUsage(
        nestingParts,
        rollDimensions.width,
        rollDimensions.length,
      );
      usedLength = usage.usedLength;
      rollAreaM2 = usage.rollAreaM2;
      materialM2 = usage.materialM2;
      hasRollPricing = true;
    }

    const materialCost = materialM2 * pricePerM2;
    const laborCost = estimatedHours * settings.hourlyRate;

    const baseCost = materialCost + laborCost;
    const totalPrice = baseCost * (1 + (settings.profitMarginPercentage / 100)) * (1 + (settings.taxPercentage / 100));
    const profit = totalPrice - baseCost - (totalPrice * (settings.taxPercentage / 100));

    return {
      usedLength,
      rollAreaM2,
      materialM2,
      hasRollPricing,
      hours: estimatedHours,
      cost: baseCost,
      price: totalPrice,
      profit,
    };
  }, [
    selectedVehicle,
    selectedPieces,
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
    vehicleModel: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.year})` : '',
    vehicleId: selectedVehicleId,
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
  }), [customerName, selectedVehicle, selectedVehicleId, selectedPieces, selectedMaterialId, customPricePerM2, totals]);

  const handleSave = async () => {
    if (!customerName || !selectedMaterialId || !selectedVehicleId) return;
    await databaseService.saveBudget(currentBudget);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleGeneratePDF = async () => {
    if (!customerName || !selectedMaterialId || !selectedVehicleId) {
      throw new Error('Preencha cliente, veículo e material antes de gerar o PDF.');
    }
    await pdfService.generateBudgetPDF(currentBudget, { material: selectedMaterial });
  };

  const canExportBudget =
    Boolean(customerName && selectedMaterialId && selectedVehicleId && selectedPieces.length > 0);

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

  const wizard = useBudgetWizard(flowSteps);

  const wizardNavBar = useMemo(
    () => (
      <BudgetWizardNavBar
        activeStep={wizard.activeStep}
        totalSteps={flowSteps.length}
        stepLabel={flowSteps[wizard.activeStep]?.shortLabel ?? ''}
        total={totals.price}
        showTotal={wizard.activeStep >= 2}
        canGoBack={wizard.canGoBack}
        canGoNext={wizard.canGoNext}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
        accent="indigo"
      />
    ),
    [
      wizard.activeStep,
      wizard.canGoBack,
      wizard.canGoNext,
      wizard.goBack,
      wizard.goNext,
      flowSteps,
      totals.price,
    ],
  );

  useMobileBottomExtras(wizardNavBar);

  return (
    <div className="space-y-4 lg:space-y-8 w-full pb-4 lg:pb-20">
      <div className="hidden lg:block">
        <PageHeader
          title="Automotivo"
          description="Monte orçamentos com veículos e materiais do catálogo"
        />
      </div>

      <BudgetFlowStepper
        steps={flowSteps}
        activeStep={wizard.activeStep}
        onStepChange={wizard.goToStep}
        canGoToStep={wizard.canGoToStep}
        accent="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
        {/* Left Col: Setup */}
        <div className="lg:col-span-2 space-y-6">
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
                  <div className="relative">
                    <select 
                      value={selectedMake}
                      onChange={(e) => {
                        setSelectedMake(e.target.value);
                        setSelectedModel('');
                        setSelectedYear('');
                      }}
                      className={cn(mobileSelectInput, 'focus:ring-indigo-500 sm:text-xs')}
                    >
                      <option value="">Marca...</option>
                      {makes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select 
                      value={selectedModel}
                      disabled={!selectedMake}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setSelectedYear('');
                      }}
                      className={cn(mobileSelectInput, 'focus:ring-indigo-500 sm:p-3 sm:text-xs disabled:opacity-30')}
                    >
                      <option value="">Modelo...</option>
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select 
                      value={selectedYear}
                      disabled={!selectedModel}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className={cn(mobileSelectInput, 'focus:ring-indigo-500 sm:p-3 sm:text-xs disabled:opacity-30')}
                    >
                      <option value="">Ano...</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
              </div>
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
                    Peças do porte {selectedVehicle.size} — só é possível orçar as que têm medida cadastrada.
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
                        {!canSelect ? (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/90">
                            Sem medida
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-600">
                            {selectedVehicle.partMeasurements[part.id]?.width.toFixed(2)} ×{' '}
                            {selectedVehicle.partMeasurements[part.id]?.length.toFixed(2)} m
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
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
        </div>

        {/* Right Col: Material (etapa 3) + Resumo (etapa 4) */}
        <div className="space-y-6">
          <section
            className={cn(
              mobileStepPanelClass('indigo', wizard.stepPanelClass(2)),
              'lg:sticky lg:top-8 lg:bg-slate-900 lg:border-indigo-500/30 lg:shadow-2xl lg:shadow-indigo-900/20',
            )}
          >
            <BudgetMobileStepHeader
              step={3}
              title="Material"
              description="Escolha o vinil e as dimensões do rolo."
              accent="indigo"
            />
            <h3 className="hidden lg:flex text-lg font-bold text-white mb-6 items-center gap-2">
              <Package className="text-indigo-500" size={20} />
              Escolha do material
            </h3>

            <div className="space-y-4">
              <MaterialCascadeSelect
                materials={materials}
                context={{ mode: 'automotive' }}
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
            </div>
          </section>

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
              <div className="hidden lg:block space-y-4">
                <MaterialCascadeSelect
                  materials={materials}
                  context={{ mode: 'automotive' }}
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
                </div>
              </div>

              <div className="pt-0 lg:pt-4 border-t-0 lg:border-t border-slate-800 space-y-3">
                  {totals.hasRollPricing ? (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 italic">Comprimento usado no rolo</span>
                        <span className="font-mono text-white">{totals.usedLength.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 italic">Área usada no rolo</span>
                        <span className="font-mono text-white">{totals.rollAreaM2.toFixed(2)} m²</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 italic">
                          Material faturado (usado + {Math.round((ROLL_WASTE_FACTOR - 1) * 100)}%)
                        </span>
                        <span className="font-mono text-indigo-300 font-bold">{totals.materialM2.toFixed(2)} m²</span>
                      </div>
                    </>
                  ) : selectedMaterialId && nestingParts.length > 0 ? (
                    <p className="text-[10px] text-amber-400/90 italic leading-snug">
                      Cadastre largura e comprimento do rolo no material para calcular o consumo (usado + 15%).
                    </p>
                  ) : null}
                  <div className="flex justify-between items-center text-sm border-t border-slate-800/50 pt-2">
                    <span className="text-slate-400">Prazos e Mão de Obra</span>
                    <span className="font-mono text-indigo-400 font-bold">{totals.hours.toFixed(1)} hrs</span>
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

              <BudgetSavePdfActions
                saveDisabled={!canExportBudget}
                pdfDisabled={!canExportBudget}
                isSaved={isSaved}
                onSave={handleSave}
                onGeneratePDF={handleGeneratePDF}
              />
            </div>
          </section>
        </div>
      </div>

      {selectedVehicleId && selectedMaterialId && nestingParts.length > 0 && (
        <div className={cn(wizard.stepPanelClass(3))}>
        {rollDimensions ? (
          <RollNestingPreview
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
  );
}
