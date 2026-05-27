import { useState, useEffect } from 'react';
import { 
  Zap, 
  Percent, 
  TrendingDown, 
  Building, 
  Save, 
  CheckCircle2,
  Calculator,
  Target,
  Receipt,
  Factory
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { FinancialSettings } from '../types';
import { motion } from 'motion/react';

export default function CostsOverview() {
  const [settings, setSettings] = useState<FinancialSettings>({
    hourlyRate: 50,
    profitMarginPercentage: 30,
    taxPercentage: 6,
    fixedCosts: 1500,
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    databaseService.getFinancialSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await databaseService.setFinancialSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="w-full space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
            <Calculator className="text-indigo-500" size={32} />
            Engenharia de Custos
          </h2>
          <p className="text-slate-500 text-sm italic font-mono">Defina os parâmetros financeiros base do seu negócio</p>
        </div>
        <button 
          onClick={handleSave}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/40 group uppercase tracking-widest text-xs"
        >
          {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} className="group-hover:rotate-12 transition-transform" />}
          {isSaved ? 'Configurações Salvas' : 'Salvar Alterações'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Taxa Horária */}
        <div className="glass rounded-3xl p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Zap size={100} className="text-indigo-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <Zap className="text-indigo-400" size={20} />
              </div>
              <h3 className="text-sm font-mono font-bold text-indigo-400 uppercase tracking-widest">Taxa Horária Operacional</h3>
            </div>
            <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Valor por hora de trabalho (BRL)</label>
            <div className="relative">
              <input 
                type="number" 
                value={settings.hourlyRate}
                onChange={(e) => setSettings({ ...settings, hourlyRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-white focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-2xl"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-mono text-sm uppercase">BRL/h</span>
            </div>
            <p className="text-[10px] text-slate-600 italic mt-2">
              Calculada com base na mão de obra especializada e tempo de aplicação.
            </p>
          </div>
        </div>

        {/* Margem de Lucro */}
        <div className="glass rounded-3xl p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Target size={100} className="text-emerald-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Percent className="text-emerald-400" size={20} />
              </div>
              <h3 className="text-sm font-mono font-bold text-emerald-400 uppercase tracking-widest">Margem de Lucro Alvo</h3>
            </div>
            <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Porcentagem de lucro sobre o serviço (%)</label>
            <div className="relative">
              <input 
                type="number" 
                value={settings.profitMarginPercentage}
                onChange={(e) => setSettings({ ...settings, profitMarginPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-white focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-2xl"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-mono text-sm">%</span>
            </div>
            <p className="text-[10px] text-slate-600 italic mt-2">
              Margem líquida desejada após todos os custos e impostos.
            </p>
          </div>
        </div>

        {/* Impostos */}
        <div className="glass rounded-3xl p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Receipt size={100} className="text-amber-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <TrendingDown className="text-amber-400" size={20} />
              </div>
              <h3 className="text-sm font-mono font-bold text-amber-400 uppercase tracking-widest">Impostos e Emissão de NF</h3>
            </div>
            <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Carga tributária média (%)</label>
            <div className="relative">
              <input 
                type="number" 
                value={settings.taxPercentage}
                onChange={(e) => setSettings({ ...settings, taxPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-white focus:ring-2 focus:ring-amber-500 transition-all font-mono text-2xl"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-mono text-sm">%</span>
            </div>
            <p className="text-[10px] text-slate-600 italic mt-2">
              Inclua taxas de cartão, impostos federais/municipais e custos de NF.
            </p>
          </div>
        </div>

        {/* Custos Fixos */}
        <div className="glass rounded-3xl p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Building size={100} className="text-slate-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center border border-slate-500/20">
                <Factory className="text-slate-400" size={20} />
              </div>
              <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-widest">Custos Operacionais Fixos</h3>
            </div>
            <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Custo mensal fixo da estrutura (BRL)</label>
            <div className="relative">
              <input 
                type="number" 
                value={settings.fixedCosts}
                onChange={(e) => setSettings({ ...settings, fixedCosts: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-white focus:ring-2 focus:ring-slate-400 transition-all font-mono text-2xl"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-mono text-sm">BRL</span>
            </div>
            <p className="text-[10px] text-slate-600 italic mt-2">
              Aluguel, energia, internet e softwares de gestão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
