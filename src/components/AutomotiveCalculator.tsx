import { useState, useMemo, useEffect } from 'react';
import { 
  Car, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  FileDown, 
  Package,
  Zap,
  LayoutDashboard,
  ChevronDown,
  Info,
  AlertTriangle,
  History,
} from 'lucide-react';
import { VEHICLE_PARTS_DATA, VEHICLE_PRESETS, VEHICLES_DATABASE } from '../types/vehicleParts';
import { VehicleSize, BudgetPiece, Budget, FinancialSettings, Material, Vehicle } from '../types';
import { databaseService } from '../services/databaseService';
import { formatCurrency, generateId, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { pdfService } from '../services/pdfService';
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
  const [isSaved, setIsSaved] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<FinancialSettings>({
    hourlyRate: 50,
    profitMarginPercentage: 30,
    taxPercentage: 6,
    fixedCosts: 1500,
  });

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

  const isComplete = useMemo(() => {
    if (!selectedVehicle) return false;
    const preset = VEHICLE_PRESETS[selectedVehicle.size] || [];
    return preset.every(partId => {
      const m = selectedVehicle.partMeasurements[partId];
      return m && m.width > 0 && m.length > 0;
    });
  }, [selectedVehicle]);

  // Enforce partial if not complete
  useEffect(() => {
    if (selectedVehicle && !isComplete) {
      setBudgetType('Parcial');
    }
  }, [selectedVehicle, isComplete]);

  // Sync pieces if "Completo"
  useEffect(() => {
    if (budgetType === 'Completo' && selectedVehicle) {
      setSelectedPieces(VEHICLE_PRESETS[selectedVehicle.size] || []);
    }
  }, [budgetType, selectedVehicle]);

  const togglePiece = (id: string) => {
    if (budgetType === 'Completo') return;
    setSelectedPieces(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const totals = useMemo(() => {
    if (!selectedVehicle) return { meters: 0, hours: 0, cost: 0, price: 0, profit: 0, materialM2: 0 };

    const pieces = VEHICLE_PARTS_DATA.filter(p => selectedPieces.includes(p.id));
    
    let totalArea = 0;
    let totalLength = 0;

    pieces.forEach(p => {
      const m = selectedVehicle.partMeasurements[p.id];
      if (m) {
        totalArea += (m.width * m.length);
        totalLength += m.length;
      }
    });

    // Adiciona margem de 15% para cortes e sobreposições
    const materialM2 = totalArea * 1.15;

    const totalDifficulty = pieces.reduce((acc, p) => acc + p.difficulty, 0);
    const estimatedHours = totalDifficulty * 0.75; 

    const material = materials.find(m => m.id === selectedMaterialId);
    const pricePerM2 = customPricePerM2 ?? (material?.pricePerM2 || 0);

    const materialCost = materialM2 * pricePerM2;
    const laborCost = estimatedHours * settings.hourlyRate;
    
    const baseCost = materialCost + laborCost;
    const totalPrice = baseCost * (1 + (settings.profitMarginPercentage / 100)) * (1 + (settings.taxPercentage / 100));
    const profit = totalPrice - baseCost - (totalPrice * (settings.taxPercentage / 100));

    return {
      meters: totalLength,
      materialM2,
      hours: estimatedHours,
      cost: baseCost,
      price: totalPrice,
      profit
    };
  }, [selectedVehicle, selectedPieces, selectedMaterialId, customPricePerM2, materials, settings]);

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
    totalMaterialMeters: totals.meters,
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
    if (!customerName || !selectedMaterialId || !selectedVehicleId) return;
    await pdfService.generateBudgetPDF(currentBudget);
  };

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const isRecommended = selectedMaterial?.recommendedFor.includes('Automotivo');

  return (
    <div className="space-y-8 w-full pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Car className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Cálculo Automotivo</h2>
            <p className="text-slate-400 text-sm italic">Base de dados de veículos e materiais</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            disabled={!customerName || selectedPieces.length === 0 || !selectedMaterialId}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-900/20"
          >
            {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {isSaved ? 'Salvo' : 'Salvar Orçamento'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Setup */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-slate-500 ml-1">Cliente</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-4 text-base sm:text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                  />
                  <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-mono uppercase tracking-widest text-slate-500 ml-1">Veículo (DB)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <select 
                      value={selectedMake}
                      onChange={(e) => {
                        setSelectedMake(e.target.value);
                        setSelectedModel('');
                        setSelectedYear('');
                      }}
                      className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-base sm:text-xs text-white focus:ring-2 focus:ring-indigo-500 appearance-none transition-all font-sans"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 appearance-none transition-all font-sans text-xs disabled:opacity-30"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 appearance-none transition-all font-sans text-xs disabled:opacity-30"
                    >
                      <option value="">Ano...</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-800">
               <button
                  disabled={!isComplete && selectedVehicleId !== ''}
                  onClick={() => setBudgetType('Completo')}
                  className={cn(
                    "w-full sm:flex-1 p-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
                    budgetType === 'Completo' ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-900/20" : "bg-slate-950 border-slate-800 text-slate-500",
                    !isComplete && selectedVehicleId !== '' && "opacity-30 cursor-not-allowed"
                  )}
               >
                 <Car size={16} /> Completo
                 {!isComplete && selectedVehicleId !== '' && <Info size={12} className="ml-1" title="Medidas insuficientes para plano completo" />}
               </button>
               <button
                  onClick={() => setBudgetType('Parcial')}
                  className={cn(
                    "w-full sm:flex-1 p-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
                    budgetType === 'Parcial' ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-900/20" : "bg-slate-950 border-slate-800 text-slate-500"
                  )}
               >
                 <History size={16} /> Parcial
               </button>
            </div>
          </section>

          <AnimatePresence>
            {budgetType === 'Parcial' && (
              <motion.section 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
              >
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-6">Seleção de Peças</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {VEHICLE_PARTS_DATA.map(part => (
                    <button
                      key={part.id}
                      onClick={() => togglePiece(part.id)}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-left group flex items-center justify-between",
                        selectedPieces.includes(part.id)
                          ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-200"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      )}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-tight leading-tight">{part.name}</span>
                      {selectedPieces.includes(part.id) && <Zap size={12} className="text-indigo-400 fill-indigo-400" />}
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {selectedMaterialId && (
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 shadow-sm">
              <div className="w-16 h-16 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 shrink-0">
                 <Package className="text-indigo-500" size={24} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between">
                  <h4 className="font-bold text-white text-lg">{selectedMaterial?.name}</h4>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase h-fit mt-1",
                    isRecommended ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  )}>
                    {isRecommended ? 'Recomendado' : 'Não Recomendado'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{selectedMaterial?.brand} • {selectedMaterial?.type} • Linha {selectedMaterial?.line}</p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                  <Info size={14} className="text-indigo-400" />
                  <p className="text-[10px] italic text-slate-500">{selectedMaterial?.details}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Col: Dashboard de Resultado */}
        <div className="space-y-6">
          <section className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-900/20 lg:sticky lg:top-8">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <LayoutDashboard className="text-indigo-500" size={20} />
              Resumo do Orçamento
            </h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Material Selecionado</label>
                  <select 
                    value={selectedMaterialId}
                    onChange={(e) => {
                      setSelectedMaterialId(e.target.value);
                      setCustomPricePerM2(null);
                    }}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-white focus:ring-1 focus:ring-indigo-500 appearance-none font-sans"
                  >
                    <option value="">Escolher Vinil...</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.brand})</option>
                    ))}
                  </select>
                </div>

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

                <div className="pt-4 border-t border-slate-800 space-y-3">
                   <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 italic">Consumo Linear Estimado</span>
                    <span className="font-mono text-white">{totals.meters.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 italic">Área Total Calculada</span>
                    <span className="font-mono text-white">{totals.materialM2.toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-slate-800/50 pt-2">
                    <span className="text-slate-400">Prazos e Mão de Obra</span>
                    <span className="font-mono text-indigo-400 font-bold">{totals.hours.toFixed(1)} hrs</span>
                  </div>
                </div>
              </div>

              {!isRecommended && selectedMaterialId && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                  <p className="text-[10px] text-amber-200/70 italic">Alerta: Este material não tem recomendação direta de fábrica para esta finalidade.</p>
                </div>
              )}

              <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-xl shadow-inner">
                <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1 text-center font-bold">Investimento Sugerido</p>
                <h4 className="text-4xl font-black text-white text-center tracking-tighter">
                  {formatCurrency(totals.price)}
                </h4>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  disabled={!customerName || !selectedMaterialId || !selectedVehicleId}
                  onClick={handleGeneratePDF}
                  className="w-full bg-white text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                >
                  <FileDown size={20} />
                  GERAR PDF PROFISSIONAL
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
