import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Car,
  Refrigerator,
  ChevronRight,
  UserPlus,
  Percent,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminStats } from '../../types';
import { ROUTES } from '../../routes/paths';
import { formatCurrency, cn } from '../../lib/utils';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService
      .getStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'));
  }, []);

  if (error) {
    return (
      <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        {error}
      </p>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Aplicadores ativos',
      value: String(stats.totalApplicants),
      sub:
        stats.inactiveApplicants > 0
          ? `${stats.inactiveApplicants} desativado(s) · +${stats.newApplicantsThisMonth} no mês`
          : `+${stats.newApplicantsThisMonth} este mês`,
      icon: <Users className="text-amber-400" />,
      accent: 'amber',
    },
    {
      label: 'Ativos (30 dias)',
      value: String(stats.activeApplicantsLast30Days),
      sub: 'Com orçamento recente',
      icon: <UserPlus className="text-emerald-400" />,
      accent: 'emerald',
    },
    {
      label: 'GMV (finalizados)',
      value: formatCurrency(stats.gmvFinalized),
      sub: `${stats.finalizedBudgets} orçamentos`,
      icon: <DollarSign className="text-emerald-400" />,
      accent: 'emerald',
    },
    {
      label: 'Lucro agregado',
      value: formatCurrency(stats.profitFinalized),
      sub: 'Orçamentos finalizados',
      icon: <TrendingUp className="text-indigo-400" />,
      accent: 'indigo',
    },
    {
      label: 'Orçamentos',
      value: String(stats.totalBudgets),
      sub: `${stats.pendingBudgets} pendentes`,
      icon: <FileText className="text-slate-300" />,
      accent: 'slate',
    },
    {
      label: 'Conversão',
      value: `${(stats.conversionRate * 100).toFixed(0)}%`,
      sub: 'Finalizados / total',
      icon: <Percent className="text-amber-400" />,
      accent: 'amber',
    },
  ];

  const shortcuts = [
    { label: 'Ver usuários', to: ROUTES.admin.users, icon: Users },
    { label: 'Orçamentos globais', to: ROUTES.admin.budgets, icon: FileText },
    { label: 'Catálogo de materiais', to: ROUTES.catalog, icon: Package },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">{card.icon}</div>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Catálogo global</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CatalogStat
            icon={<Package size={18} className="text-indigo-400" />}
            label="Materiais"
            value={stats.catalog.materialsCount}
          />
          <CatalogStat
            icon={<Car size={18} className="text-indigo-400" />}
            label="Veículos"
            value={stats.catalog.vehiclesCount}
            warn={stats.catalog.vehiclesIncomplete}
            warnLabel="incompletos"
          />
          <CatalogStat
            icon={<Refrigerator size={18} className="text-indigo-400" />}
            label="Eletros"
            value={stats.catalog.appliancesCount}
          />
          <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
            <p className="text-[10px] font-mono uppercase text-slate-500">Por tipo</p>
            <p className="text-sm text-white mt-1">
              Auto: {stats.budgetsByType['Automotivo'] ?? 0} · Dec:{' '}
              {stats.budgetsByType['Decorativo'] ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-white mb-3">Atalhos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {shortcuts.map(({ label, to, icon: Icon }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={20} className="text-amber-400 shrink-0" />
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
              <ChevronRight
                size={18}
                className="text-slate-500 group-hover:text-amber-400 shrink-0"
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CatalogStat({
  icon,
  label,
  value,
  warn,
  warnLabel,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  warn?: number;
  warnLabel?: string;
}) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-[10px] font-mono uppercase text-slate-500">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {warn !== undefined && warn > 0 && (
        <p className={cn('text-[10px] mt-1 font-mono', 'text-amber-400')}>
          {warn} {warnLabel}
        </p>
      )}
    </div>
  );
}
