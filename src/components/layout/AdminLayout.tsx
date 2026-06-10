import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Users, LayoutDashboard, FileText, Package, Car, Refrigerator, Truck } from 'lucide-react';
import { ROUTES } from '../../routes/paths';
import { cn } from '../../lib/utils';

const adminNav = [
  { to: ROUTES.admin.home, label: 'Início', icon: LayoutDashboard, end: true },
  { to: ROUTES.admin.users, label: 'Usuários', icon: Users, end: false },
  { to: ROUTES.admin.budgets, label: 'Orçamentos', icon: FileText, end: false },
  { to: ROUTES.admin.suppliers, label: 'Fornecedores', icon: Truck, end: false },
] as const;

const catalogLinks = [
  { to: ROUTES.catalog, label: 'Catálogo', icon: Package },
  { to: ROUTES.vehiclesBase, label: 'Veículos', icon: Car },
  { to: ROUTES.appliancesBase, label: 'Eletros', icon: Refrigerator },
] as const;

export default function AdminLayout() {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');

  if (!isAdminArea) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6 w-full pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Painel Administrativo
          </h2>
          <p className="text-slate-400 mt-1 text-sm">Gestão da rede de aplicadores</p>
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
        aria-label="Navegação administrativa"
      >
        {adminNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent',
              )
            }
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}
        <span className="w-px h-8 bg-slate-800 shrink-0 self-center mx-1" />
        {catalogLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                isActive
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent',
              )
            }
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
