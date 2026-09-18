import { type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { ROUTES } from '../../routes/paths';
import { databaseService } from '../../services/databaseService';
import { cn } from '../../lib/utils';

interface ClientLayoutProps {
  user: User;
  onLogout: () => void;
}

const NAV_ITEMS: { to: string; icon: ReactNode; label: string; short: string; end?: boolean }[] = [
  {
    to: ROUTES.client.home,
    icon: <LayoutDashboard size={20} />,
    label: 'Início',
    short: 'Início',
    end: true,
  },
  {
    to: ROUTES.client.orders,
    icon: <ClipboardList size={20} />,
    label: 'Meus pedidos',
    short: 'Pedidos',
  },
  {
    to: ROUTES.client.profile,
    icon: <UserIcon size={20} />,
    label: 'Meus dados',
    short: 'Perfil',
  },
];

const sidebarItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all duration-200 group',
    isActive
      ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 translate-x-1'
      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
  );

const bottomNavItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] px-1 py-2 transition-colors',
    isActive ? 'text-emerald-400' : 'text-slate-500 active:text-slate-300',
  );

function pageTitle(pathname: string): string {
  if (pathname.startsWith(ROUTES.client.orders)) return 'Meus pedidos';
  if (pathname.startsWith(ROUTES.client.profile)) return 'Meus dados';
  return 'Início';
}

export default function ClientLayout({ user, onLogout }: ClientLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await databaseService.logout();
    onLogout();
    navigate(ROUTES.client.login, { replace: true });
  };

  const firstName = user.businessName.trim().split(/\s+/)[0] || 'Cliente';

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 text-slate-200">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col h-full min-h-0 bg-slate-950/50 backdrop-blur-xl border-r border-slate-900">
        <div className="p-6 border-b border-slate-900 flex items-center gap-3 min-w-0">
          <img
            src="/login.png"
            alt="Aplica PRO"
            className="w-10 h-10 rounded-lg object-contain shrink-0"
            draggable={false}
          />
          <div className="min-w-0">
            <h1 className="font-bold text-lg tracking-tight text-white leading-none">Aplica Pro</h1>
            <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
              Área do Cliente
            </span>
          </div>
        </div>

        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={sidebarItemClass}>
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <span
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300',
                    )}
                  >
                    {icon}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto shrink-0 p-4 border-t border-slate-900">
          <p className="px-3 pb-3 text-xs text-slate-600 truncate" title={user.email}>
            {user.email}
          </p>
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
        <header className="lg:hidden shrink-0 z-20 flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
          <img
            src="/login.png"
            alt=""
            aria-hidden
            className="w-8 h-8 rounded-lg object-contain shrink-0"
            draggable={false}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {pageTitle(location.pathname)}
            </p>
            <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase truncate">
              Olá, {firstName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Sair"
            className="shrink-0 p-2 rounded-lg text-slate-500 active:text-red-400"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <Outlet context={{ user }} />
        </main>

        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] flex items-stretch border-t border-slate-900 bg-slate-950/95 backdrop-blur-md"
          aria-label="Navegação principal"
        >
          {NAV_ITEMS.map(({ to, icon, short, end }) => (
            <NavLink key={to} to={to} end={end} className={bottomNavItemClass}>
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-lg p-1 transition-colors',
                      isActive && 'bg-emerald-600/15',
                    )}
                  >
                    {icon}
                  </span>
                  <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">
                    {short}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
