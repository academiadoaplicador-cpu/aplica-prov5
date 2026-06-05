import { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
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
import { filterMaterialsByContext } from '../utils/materialSelection';
import { getMaterialRollDimensions } from '../utils/materialRoll';
import { computeRollMaterialUsage, ROLL_WASTE_FACTOR } from '../utils/rollNesting';
import type { NestingPartInput } from '../utils/rollNesting';
type SubType = 'Móveis' | 'Eletrodomésticos' | 'Parede';

export default function DecorativeCalculator() {
  const [customerName, setCustomerName] = useState('');
  const [subType, setSubType] = useState<SubType>('Eletrodomésticos');
  const [selectedApplianceMake, setSelectedApplianceMake] = useState<string>('');
  const [selectedApplianceType, setSelectedApplianceType] = useState<string>('');
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>('');

  const [items, setItems] = useState<DecorativeItem[]>([
    { id: generateId(), name: 'Peça Principal', width: 0.5, height: 0.5, complexity: 1 }
  ]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [customPricePerM2, setCustomPricePerM2] = useState<number | null>(null);
  const [selectedRollWidth, setSelectedRollWidth] = useState<number | null>(null);
  const [selectedRollLength, setSelectedRollLength] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
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
    if (!selectedMaterialId) return;
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

  // Sync items if appliance is selected
  useEffect(() => {
    if (subType === 'Eletrodomésticos' && selectedApplianceId) {
      const app = appliances.find(a => a.id === selectedApplianceId);
      if (app) {
        // Simple logic for appliance parts (frente + 2 laterais)
        const parts: DecorativeItem[] = [
          { id: generateId(), name: `Frente (${app.type})`, width: app.width, height: app.height, complexity: 2 },
          { id: generateId(), name: 'Lateral Dir', width: app.depth, height: app.height, complexity: 1 },
          { id: generateId(), name: 'Lateral Esq', width: app.depth, height: app.height, complexity: 1 }
        ];
        setItems(parts);
      }
    }
  }, [selectedApplianceId, subType, appliances]);

  const addItem = () => {
    setItems(prev => [...prev, { id: generateId(), name: 'Nova Peça', width: 0.5, height: 0.5, complexity: 1 }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<DecorativeItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const selectedAppliance = appliances.find((a) => a.id === selectedApplianceId);
  const isRecommended = selectedMaterial?.recommendedFor.includes(subType);

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
    return items
      .filter((item) => item.width > 0 && item.height > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        width: item.width,
        length: item.height,
      }));
  }, [items]);

  const totals = useMemo(() => {
    const totalM2 = items.reduce((acc, item) => acc + (item.width * item.height), 0);

    const totalHours = items.reduce((acc, item) => {
      const baseTime = item.width * item.height;
      const multiplier = item.complexity === 1 ? 1.5 : item.complexity === 2 ? 2.5 : 4;
      return acc + (baseTime * multiplier);
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
    items,
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
    items: items.map((item) => ({
      partId: item.id,
      quantity: 1,
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
  }), [customerName, subType, selectedApplianceId, selectedMaterialId, customPricePerM2, totals, appliances, items]);

  const handleSave = async () => {
    if (!customerName || !selectedMaterialId) return;
    await databaseService.saveBudget(currentBudget);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleGeneratePDF = async () => {
    if (!customerName || !selectedMaterialId) {
      throw new Error('Preencha cliente e material antes de gerar o PDF.');
    }
    await pdfService.generateBudgetPDF(currentBudget, { material: selectedMaterial });
  };

  const canExportBudget = Boolean(customerName && selectedMaterialId && items.length > 0);

  const flowSteps = useMemo((): BudgetFlowStep[] => {
    const clientReady =
      Boolean(customerName.trim()) &&
      (subType !== 'Eletrodomésticos' || Boolean(selectedApplianceId));
    const piecesReady = items.length > 0 && items.every((i) => i.width > 0 && i.height > 0);

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
  }, [customerName, subType, selectedApplianceId, items, selectedMaterialId, canExportBudget]);

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
        accent="emerald"
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
          title="Decorativo"
          description="Orçamentos para móveis, eletrodomésticos e paredes"
        />
      </div>

      <BudgetFlowStepper
        steps={flowSteps}
        activeStep={wizard.activeStep}
        onStepChange={wizard.goToStep}
        canGoToStep={wizard.canGoToStep}
        accent="emerald"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 lg:items-start">
        <div className="lg:col-span-2 space-y-6">
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
                        setSubType(cat);
                        setSelectedApplianceId('');
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
              {items.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 lg:gap-4 p-4 lg:p-5 bg-slate-950/90 rounded-2xl border border-slate-800/90 group transition-all hover:border-slate-700 shadow-sm"
                >
                  <div className="md:col-span-4">
                    <label className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Nome da Face</label>
                    <input 
                      className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-white w-full focus:ring-1 focus:ring-emerald-500"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                     <label className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Largura (m)</label>
                    <input 
                      type="number"
                      className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-white w-full font-mono"
                      value={item.width}
                      step="0.01"
                      onChange={(e) => updateItem(item.id, { width: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Altura (m)</label>
                    <input 
                      type="number"
                      className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-white w-full font-mono"
                      value={item.height}
                      step="0.01"
                      onChange={(e) => updateItem(item.id, { height: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Dificuldade</label>
                    <select 
                      className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-[10px] text-white w-full font-bold uppercase tracking-tight"
                      value={item.complexity}
                      onChange={(e) => updateItem(item.id, { complexity: parseInt(e.target.value) as any })}
                    >
                      <option value={1}>Fácil (Plano)</option>
                      <option value={2}>Médio (Curvas)</option>
                      <option value={3}>Alto (Cantos/Puxadores)</option>
                    </select>
                  </div>
                  <div className="md:col-span-1 flex items-end justify-center pb-2">
                    <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
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

        <div className="space-y-6">
          <section
            className={cn(
              mobileStepPanelClass('emerald', wizard.stepPanelClass(2)),
              'lg:bg-slate-900 lg:border-emerald-500/30 lg:shadow-2xl lg:shadow-emerald-900/10',
            )}
          >
            <BudgetMobileStepHeader
              step={3}
              title="Material"
              description="Escolha o vinil e as dimensões do rolo."
              accent="emerald"
            />
            <h3 className="hidden lg:flex text-lg font-bold text-white mb-6 items-center gap-2">
              <Package className="text-emerald-500" size={20} />
              Escolha do material
            </h3>

            <div className="space-y-4">
              <MaterialCascadeSelect
                materials={materials}
                context={{ mode: 'decorative', subType }}
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
            </div>
          </section>

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
                        <span className="font-mono text-emerald-300 font-bold">{totals.finalM2.toFixed(2)} m²</span>
                      </div>
                    </>
                  ) : selectedMaterialId && nestingParts.length > 0 ? (
                    <p className="text-[10px] text-amber-400/90 italic leading-snug">
                      Cadastre largura e comprimento do rolo no material para calcular o consumo (usado + 15%).
                    </p>
                  ) : null}
                  <div className="flex justify-between items-center text-sm border-t border-slate-800/50 pt-2">
                    <span className="text-slate-400 font-bold">Mão de Obra</span>
                    <span className="font-mono text-emerald-400 font-bold">{totals.hours.toFixed(1)} hrs</span>
                  </div>
              </div>

              <div className="bg-emerald-600/10 border border-emerald-500/20 p-5 rounded-2xl shadow-inner text-center hidden lg:block">
                <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1 font-bold">Total Sugerido</p>
                <h4 className="text-4xl font-black text-white tracking-tighter">
                  {formatCurrency(totals.price)}
                </h4>
              </div>

              <BudgetMobileTotalHero total={totals.price} label="Total sugerido" accent="emerald" />

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
    </div>
  );
}
