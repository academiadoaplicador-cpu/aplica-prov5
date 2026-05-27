import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { ROUTES } from '../routes/paths';
import { Budget, FinancialSettings } from '../types';
import { 
  TrendingUp, 
  Car, 
  Home, 
  DollarSign, 
  Clock, 
  FileText,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const user = databaseService.getCachedUser();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);

  useEffect(() => {
    Promise.all([
      databaseService.getBudgets(),
      databaseService.getFinancialSettings(),
    ]).then(([b, s]) => {
      setBudgets(b);
      setSettings(s);
    });
  }, []);

  const stats = [
    {
      label: 'Faturamento Total',
      value: budgets.reduce((acc, b) => b.status === 'Finalizado' ? acc + b.totalPrice : acc, 0),
      icon: <DollarSign className="text-emerald-400" />,
      sub: budgets.length + ' orçamentos gerados',
      color: 'emerald'
    },
    {
      label: 'Lucro Estimado',
      value: budgets.reduce((acc, b) => b.status === 'Finalizado' ? acc + b.profit : acc, 0),
      icon: <TrendingUp className="text-indigo-400" />,
      sub: 'Média de ' + (budgets.length > 0 ? (budgets.reduce((acc, b) => acc + (b.profit / b.totalPrice * 100), 0) / budgets.length).toFixed(0) : 0) + '% de margem',
      color: 'indigo'
    },
    {
      label: 'Em Negociação',
      value: budgets.reduce((acc, b) => b.status === 'Pendente' ? acc + b.totalPrice : acc, 0),
      icon: <Clock className="text-amber-400" />,
      sub: budgets.filter(b => b.status === 'Pendente').length + ' pendentes',
      color: 'amber'
    }
  ];

  const recentBudgets = budgets.slice(-5).reverse();

  return (
    <div className="space-y-8 w-full pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Dashboard Overview</h2>
          <p className="text-slate-400 mt-1">Resumo das atividades da oficina</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={() => navigate(ROUTES.automotive)}
            className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-indigo-900/20"
          >
            <Car size={18} />
            Novo Automotivo
          </button>
          <button 
            onClick={() => navigate(ROUTES.decorative)}
            className="w-full sm:w-auto justify-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all border border-slate-700"
          >
            <Home size={18} />
            Novo Decorativo
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center mb-4 border border-slate-800">
                {stat.icon}
              </div>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(stat.value)}</h3>
              <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wider">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Work */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Orçamentos Recentes</h3>
            <button 
              onClick={() => navigate(ROUTES.orcamento)}
              className="text-xs font-mono uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Ver Tudo <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentBudgets.length > 0 ? (
              recentBudgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-slate-700 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                      budget.type === 'Automotivo' ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      {budget.type === 'Automotivo' ? <Car size={16} /> : <Home size={16} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{budget.customerName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono uppercase truncate w-32">{budget.vehicleModel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-200">{formatCurrency(budget.totalPrice)}</div>
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-tighter",
                      budget.status === 'Finalizado' ? "bg-emerald-500/10 text-emerald-400" : 
                      budget.status === 'Pendente' ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500"
                    )}>
                      {budget.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <FileText className="mx-auto text-slate-800 mb-3" size={40} />
                <p className="text-slate-500 text-sm">Nenhum orçamento encontrado</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions / Tips */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-indigo-900/20">
            <div className="relative z-10 text-white">
              <h3 className="text-xl font-bold mb-2">Configure sua oficina</h3>
              <p className="text-indigo-100 text-sm mb-6 opacity-80">Defina o valor da sua hora técnica e margem para cálculos precisos.</p>
              <button 
                onClick={() => navigate(user?.isAdmin ? ROUTES.catalog : ROUTES.costs)}
                className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors"
              >
                Acessar Ajustes
                <ArrowUpRight size={16} />
              </button>
            </div>
            <TrendingUp size={120} className="absolute -right-8 -bottom-8 text-white opacity-10 rotate-12" />
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Métricas de Precisão</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                <span className="text-slate-400 italic">Conversão</span>
                <span className="font-mono text-white">64%</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                <span className="text-slate-400 italic">Ticket Médio</span>
                <span className="font-mono text-white">{formatCurrency(budgets.length > 0 ? budgets.reduce((acc, b) => acc + b.totalPrice, 0) / budgets.length : 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
