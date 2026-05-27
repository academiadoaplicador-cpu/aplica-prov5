import { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Trash2,
  ExternalLink,
  Car,
  Home,
  TrendingDown,
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { pdfService } from '../services/pdfService';
import { Budget, Material } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import BudgetDetailDrawer from './BudgetDetailDrawer';

export default function BudgetHistory() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [fixedCosts, setFixedCosts] = useState(1500);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'Tudo' | 'Automotivo' | 'Decorativo'>('Tudo');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      databaseService.getBudgets(),
      databaseService.getFinancialSettings(),
      databaseService.getMaterials(),
    ]).then(([b, s, m]) => {
      setBudgets(b);
      setFixedCosts(s.fixedCosts);
      setMaterials(m);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este orçamento permanentemente?')) {
      await databaseService.deleteBudget(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const updateStatus = async (id: string, status: Budget['status']) => {
    const budget = budgets.find((b) => b.id === id);
    if (budget) {
      const updated = { ...budget, status };
      await databaseService.saveBudget(updated);
      setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
    }
  };

  const filteredBudgets = useMemo(
    () =>
      budgets
        .filter((b) => {
          const project = (b.vehicleModel || b.applianceModel || '').toLowerCase();
          const matchesSearch =
            b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.includes(searchTerm.toLowerCase());
          const matchesType = filterType === 'Tudo' || b.type === filterType;
          return matchesSearch && matchesType;
        })
        .reverse(),
    [budgets, searchTerm, filterType],
  );

  const selectedIndex = selectedId
    ? filteredBudgets.findIndex((b) => b.id === selectedId)
    : -1;
  const selectedBudget =
    selectedIndex >= 0 ? filteredBudgets[selectedIndex] : null;

  const openDetails = (id: string) => setSelectedId(id);
  const closeDetails = () => setSelectedId(null);

  const goToPrevious = () => {
    if (selectedIndex > 0) {
      setSelectedId(filteredBudgets[selectedIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (selectedIndex >= 0 && selectedIndex < filteredBudgets.length - 1) {
      setSelectedId(filteredBudgets[selectedIndex + 1].id);
    }
  };

  const handleDrawerDelete = async () => {
    if (!selectedBudget) return;
    await handleDelete(selectedBudget.id);
  };

  const handleDrawerStatusChange = (status: Budget['status']) => {
    if (!selectedBudget) return;
    void updateStatus(selectedBudget.id, status);
  };

  const handleGeneratePDF = async () => {
    if (!selectedBudget) return;
    await pdfService.generateBudgetPDF(selectedBudget);
  };

  return (
    <div className="space-y-6 w-full pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Histórico de Orçamentos
          </h2>
          <p className="text-slate-400 mt-1">CRM e Gestão de Vendas</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar cliente ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner w-full md:w-auto">
            {(['Tudo', 'Automotivo', 'Decorativo'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                  filterType === type
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] sm:min-w-0 text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">
                  Data
                </th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">
                  Cliente / Projeto
                </th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest italic text-center">
                  Tipo
                </th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest italic text-right">
                  Valor Total
                </th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest italic text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <AnimatePresence>
                {filteredBudgets.map((budget, idx) => (
                  <motion.tr
                    key={budget.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => openDetails(budget.id)}
                    className={cn(
                      'hover:bg-slate-900/50 transition-colors group cursor-pointer',
                      selectedId === budget.id && 'bg-indigo-600/5',
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-slate-500 font-mono">
                        {new Date(budget.date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {budget.customerName}
                        </span>
                        <span className="text-[10px] text-slate-500 italic truncate w-48">
                          {budget.vehicleModel || budget.applianceModel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center border',
                            budget.type === 'Automotivo'
                              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                          )}
                        >
                          {budget.type === 'Automotivo' ? <Car size={16} /> : <Home size={16} />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={budget.status}
                        onChange={(e) =>
                          updateStatus(budget.id, e.target.value as Budget['status'])
                        }
                        className={cn(
                          'text-[10px] font-mono font-bold uppercase py-1 px-2 rounded-lg bg-slate-950 border focus:outline-none focus:ring-1',
                          budget.status === 'Finalizado'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : budget.status === 'Pendente'
                              ? 'text-amber-400 border-amber-500/30'
                              : budget.status === 'Cancelado'
                                ? 'text-red-400 border-red-500/30'
                                : 'text-slate-500 border-slate-700',
                        )}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-white font-mono">
                        {formatCurrency(budget.totalPrice)}
                      </div>
                      <div className="text-[9px] text-indigo-400 font-mono uppercase opacity-60">
                        Profit: {formatCurrency(budget.profit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetails(budget.id)}
                          className={cn(
                            'p-2 rounded-lg transition-all',
                            selectedId === budget.id
                              ? 'text-indigo-400 bg-indigo-500/10'
                              : 'text-slate-600 hover:text-white hover:bg-slate-800',
                          )}
                          title="Visualizar detalhes"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(budget.id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredBudgets.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center">
              <History size={48} className="text-slate-800 mb-4" />
              <p className="text-slate-500 font-medium">Nenhum registro encontrado para estes filtros.</p>
            </div>
          )}
        </div>
      </section>

      <div className="bg-indigo-600/5 border border-indigo-500/10 p-4 rounded-xl flex items-center gap-3">
        <div className="bg-indigo-600/20 p-2 rounded-lg text-indigo-400">
          <TrendingDown size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-200">Dica Pro: Ponto de Equilíbrio</h4>
          <p className="text-[11px] text-slate-500 italic">
            Você atingiu 82% da meta baseada nos custos fixos de {formatCurrency(fixedCosts)}.
          </p>
        </div>
      </div>

      <BudgetDetailDrawer
        budget={selectedBudget}
        materials={materials}
        open={selectedBudget !== null}
        onClose={closeDetails}
        onPrevious={goToPrevious}
        onNext={goToNext}
        hasPrevious={selectedIndex > 0}
        hasNext={selectedIndex >= 0 && selectedIndex < filteredBudgets.length - 1}
        currentIndex={Math.max(selectedIndex, 0)}
        totalCount={filteredBudgets.length}
        onStatusChange={handleDrawerStatusChange}
        onDelete={handleDrawerDelete}
        onGeneratePDF={handleGeneratePDF}
      />
    </div>
  );
}
