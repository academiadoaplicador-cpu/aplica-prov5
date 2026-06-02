import { useState, useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Calculator,
  History,
  LogOut,
  Car,
  Home,
  LayoutDashboard,
  User as UserIcon,
  Package,
  Refrigerator,
  MoreHorizontal,
  X,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../../types';
import { databaseService } from '../../services/databaseService';
import { ROUTES } from '../../routes/paths';
import { cn } from '../../lib/utils';

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
}

const DRAWER_ONLY_PREFIXES = [
  ROUTES.costs,
  ROUTES.profile,
  ROUTES.catalog,
  ROUTES.appliancesBase,
  ROUTES.vehiclesBase,
  '/admin',
] as const;

function isDrawerOnlyRoute(pathname: string): boolean {
  return DRAWER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getMobilePageTitle(pathname: string): string {
  if (pathname === ROUTES.dashboard) return 'Início';
  if (pathname.startsWith(ROUTES.costs)) return 'Custos';
  if (pathname.startsWith(ROUTES.automotive)) return 'Automotivo';
  if (pathname.startsWith(ROUTES.decorative)) return 'Decorativo';
  if (pathname.startsWith(ROUTES.orcamento)) return 'Orçamento';
  if (pathname.startsWith(ROUTES.profile)) return 'Perfil';
  if (pathname.startsWith(ROUTES.catalog)) return 'Catálogo';
  if (pathname.startsWith(ROUTES.vehiclesBase)) return 'Base de Veículos';
  if (pathname.startsWith(ROUTES.appliancesBase)) return 'Base de Eletros';
  if (pathname.startsWith('/admin')) return 'Administração';
  return 'Aplica Pro';
}

export default function AppLayout({ user, onLogout }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await databaseService.logout();
    onLogout();
    navigate(ROUTES.login, { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 text-slate-200">
      {/* Overlay — mobile/tablet only */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={closeSidebar}
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64',
          'bg-slate-950/50 backdrop-blur-xl border-r border-slate-900',
          'flex flex-col h-full min-h-0 shrink-0',
          'transform transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:relative lg:z-auto',
        )}
      >
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/login.png"
              alt="Aplica PRO"
              className="w-10 h-10 rounded-lg object-contain shrink-0"
              draggable={false}
            />
            <div className="min-w-0">
              <h1 className="font-bold text-lg tracking-tight text-white leading-none">Aplica Pro</h1>
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">
                Instalação Inteligente
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
          <NavItem to={ROUTES.dashboard} icon={<LayoutDashboard size={20} />} label="Início" onNavigate={closeSidebar} />
          <NavItem to={ROUTES.costs} icon={<Calculator size={20} />} label="Custos" onNavigate={closeSidebar} />
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Calculadoras</span>
          </div>
          <NavItem to={ROUTES.automotive} icon={<Car size={20} />} label="Automotivo" onNavigate={closeSidebar} />
          <NavItem to={ROUTES.decorative} icon={<Home size={20} />} label="Decorativo" onNavigate={closeSidebar} />
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Gestão</span>
          </div>
          {user.isAdmin && (
            <>
              <NavItem to={ROUTES.admin.home} icon={<Shield size={20} />} label="Administração" onNavigate={closeSidebar} />
              <NavItem to={ROUTES.catalog} icon={<Package size={20} />} label="Catálogo Profissional" onNavigate={closeSidebar} />
              <NavItem to={ROUTES.vehiclesBase} icon={<Car size={20} />} label="Base de Veículos" onNavigate={closeSidebar} />
              <NavItem to={ROUTES.appliancesBase} icon={<Refrigerator size={20} />} label="Base de Eletros" onNavigate={closeSidebar} />
            </>
          )}
          <NavItem to={ROUTES.orcamento} icon={<History size={20} />} label="Orçamento" onNavigate={closeSidebar} />
        </nav>

        <div className="mt-auto shrink-0 p-4 border-t border-slate-900 space-y-1">
          <NavItem to={ROUTES.profile} icon={<UserIcon size={20} />} label="Perfil" onNavigate={closeSidebar} />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group"
          >
            <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top bar — mobile/tablet only (sem hamburger; nav principal fica na bottom bar) */}
        <header className="lg:hidden shrink-0 z-20 flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
          <img
            src="/login.png"
            alt=""
            aria-hidden
            className="w-8 h-8 rounded-lg object-contain shrink-0"
            draggable={false}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {getMobilePageTitle(location.pathname)}
            </p>
            <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase truncate">
              Aplica Pro
            </p>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Bottom navigation — mobile/tablet only */}
        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-slate-900 bg-slate-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
          aria-label="Navegação principal"
        >
          <BottomNavItem
            to={ROUTES.dashboard}
            icon={<LayoutDashboard size={20} />}
            label="Início"
            end
          />
          <BottomNavItem
            to={ROUTES.automotive}
            icon={<Car size={20} />}
            label="Auto"
          />
          <BottomNavItem
            to={ROUTES.orcamento}
            icon={<History size={20} />}
            label="Orçamento"
          />
          <BottomNavItem
            to={ROUTES.decorative}
            icon={<Home size={20} />}
            label="Deco"
          />
          <BottomNavMore
            active={isDrawerOnlyRoute(location.pathname) || sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          />
        </nav>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === ROUTES.dashboard}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all duration-200 group',
          isActive
            ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 translate-x-1'
            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 shrink-0'}>{icon}</div>
          <span className="text-sm font-medium">{label}</span>
          {isActive && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );
}

function BottomNavItem({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] px-1 py-2 transition-colors',
          isActive ? 'text-indigo-400' : 'text-slate-500 active:text-slate-300',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex items-center justify-center rounded-lg p-1 transition-colors',
              isActive && 'bg-indigo-600/15',
            )}
          >
            {icon}
          </span>
          <span className="text-[10px] font-medium leading-none truncate max-w-full">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function BottomNavMore({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir menu completo"
      aria-expanded={active}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] px-1 py-2 transition-colors',
        active ? 'text-indigo-400' : 'text-slate-500 active:text-slate-300',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-lg p-1 transition-colors',
          active && 'bg-indigo-600/15',
        )}
      >
        <MoreHorizontal size={20} />
      </span>
      <span className="text-[10px] font-medium leading-none">Mais</span>
    </button>
  );
}
