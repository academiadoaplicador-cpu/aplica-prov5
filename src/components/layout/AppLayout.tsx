import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calculator,
  History,
  LogOut,
  Car,
  Home,
  LayoutDashboard,
  User as UserIcon,
  Package,
  Refrigerator,
  Megaphone,
  MoreHorizontal,
  Search,
  Shield,
  Truck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Promotion, User } from '../../types';
import { databaseService } from '../../services/databaseService';
import { ROUTES } from '../../routes/paths';
import { cn } from '../../lib/utils';
import PromotionPopup, { alreadyShownToday, markShownToday } from '../PromotionPopup';
import {
  MobileBottomExtrasProvider,
  useMobileBottomExtrasContent,
} from '../../contexts/MobileBottomExtrasContext';
import { CalculatorModeProvider, useCalculatorMode, type CalculatorMode } from '../../contexts/CalculatorModeContext';
import AppMainContent from './AppMainContent';

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
}

type MoreMenuEntry = {
  to: string;
  icon: ReactNode;
  label: string;
  searchTerms: string;
  end?: boolean;
};

const MORE_MENU_PREFIXES = [
  ROUTES.costs,
  ROUTES.profile,
  ROUTES.catalog,
  ROUTES.appliancesBase,
  ROUTES.vehiclesBase,
  ROUTES.guiaTecnico,
  '/admin',
] as const;

function isMoreMenuRoute(pathname: string): boolean {
  return MORE_MENU_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getMobilePageTitle(pathname: string): string {
  if (pathname === ROUTES.dashboard) return 'Início';
  if (pathname.startsWith(ROUTES.costs)) return 'Custos';
  if (pathname.startsWith(ROUTES.automotive)) return 'Novo orçamento';
  if (pathname.startsWith(ROUTES.decorative)) return 'Novo orçamento';
  if (pathname.startsWith(ROUTES.orcamento)) return 'Orçamento';
  if (pathname.startsWith(ROUTES.profile)) return 'Perfil';
  if (pathname.startsWith(ROUTES.catalog)) return 'Catálogo';
  if (pathname.startsWith(ROUTES.vehiclesBase)) return 'Base de Veículos';
  if (pathname.startsWith(ROUTES.appliancesBase)) return 'Base de Eletros';
  if (pathname.startsWith(ROUTES.guiaTecnico)) return 'Guia Técnico';
  if (pathname.startsWith(ROUTES.admin.promotions)) return 'Promoções';
  if (pathname.startsWith('/admin')) return 'Administração';
  return 'Aplica Pro';
}

function getMobilePageSubtitle(pathname: string): string {
  if (pathname.startsWith(ROUTES.automotive)) return 'Automotivo';
  if (pathname.startsWith(ROUTES.decorative)) return 'Decorativo';
  return 'Aplica Pro';
}

function buildMoreMenuItems(user: User): MoreMenuEntry[] {
  const items: MoreMenuEntry[] = [
    {
      to: ROUTES.costs,
      icon: <Calculator size={20} />,
      label: 'Custos',
      searchTerms: 'custos parâmetros preço',
    },
    {
      to: ROUTES.guiaTecnico,
      icon: <BookOpen size={20} />,
      label: 'Guia Técnico',
      searchTerms: 'guia técnico envelopamento eletros móveis vidros manual',
    },
  ];

  if (user.isAdmin) {
    items.push(
      {
        to: ROUTES.admin.home,
        icon: <Shield size={20} />,
        label: 'Administração',
        searchTerms: 'admin painel usuários',
        end: true,
      },
      {
        to: ROUTES.admin.promotions,
        icon: <Megaphone size={20} />,
        label: 'Promoções',
        searchTerms: 'promoções anúncios banners popup',
      },
      {
        to: ROUTES.catalog,
        icon: <Package size={20} />,
        label: 'Catálogo Profissional',
        searchTerms: 'catálogo materiais profissional',
      },
      {
        to: ROUTES.vehiclesBase,
        icon: <Car size={20} />,
        label: 'Base de Veículos',
        searchTerms: 'veículos carros base automotivo',
      },
      {
        to: ROUTES.appliancesBase,
        icon: <Refrigerator size={20} />,
        label: 'Base de Eletros',
        searchTerms: 'eletrodomésticos geladeira fogão',
      },
      {
        to: ROUTES.admin.suppliers,
        icon: <Truck size={20} />,
        label: 'Fornecedores',
        searchTerms: 'fornecedor whatsapp distribuidor',
      },
    );
  }

  items.push({
    to: ROUTES.profile,
    icon: <UserIcon size={20} />,
    label: 'Perfil',
    searchTerms: 'perfil conta usuário dados',
  });

  return items;
}

export default function AppLayout({ user, onLogout }: AppLayoutProps) {
  return (
    <MobileBottomExtrasProvider>
      <CalculatorModeProvider>
        <AppLayoutShell user={user} onLogout={onLogout} />
      </CalculatorModeProvider>
    </MobileBottomExtrasProvider>
  );
}

function AppLayoutShell({ user, onLogout }: AppLayoutProps) {
  const bottomExtras = useMobileBottomExtrasContent();
  const { mode: calculatorMode, appPath } = useCalculatorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSearch, setMoreSearch] = useState('');
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);

  const moreMenuItems = useMemo(() => buildMoreMenuItems(user), [user]);

  useEffect(() => {
    setMoreOpen(false);
    setMoreSearch('');
  }, [appPath]);

  useEffect(() => {
    if (alreadyShownToday(user.id)) return;
    databaseService
      .getActivePromotion()
      .then((promotion) => {
        if (promotion) {
          setActivePromotion(promotion);
          markShownToday(user.id);
        }
      })
      .catch(() => {});
  }, [user.id]);

  const handleLogout = async () => {
    await databaseService.logout();
    onLogout();
    navigate(ROUTES.login, { replace: true });
  };

  const closeMore = () => {
    setMoreOpen(false);
    setMoreSearch('');
  };

  const toggleMore = () => {
    setMoreOpen((open) => {
      if (open) setMoreSearch('');
      return !open;
    });
  };

  const normalizedQuery = moreSearch.trim().toLowerCase();
  const filteredMoreItems = useMemo(() => {
    if (!normalizedQuery) return moreMenuItems;
    return moreMenuItems.filter(
      (item) =>
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.searchTerms.toLowerCase().includes(normalizedQuery),
    );
  }, [moreMenuItems, normalizedQuery]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 text-slate-200">
      {/* Overlay — mobile "Mais" panel only */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={closeMore}
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex',
          'w-64 bg-slate-950/50 backdrop-blur-xl border-r border-slate-900',
          'flex-col h-full min-h-0 shrink-0',
        )}
      >
        <div className="p-6 border-b border-slate-900 flex items-center gap-3 min-w-0">
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

        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
          <NavItem to={ROUTES.dashboard} icon={<LayoutDashboard size={20} />} label="Início" />
          <NavItem to={ROUTES.costs} icon={<Calculator size={20} />} label="Custos" />
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Calculadoras</span>
          </div>
          <NavCalculatorItem mode="automotive" icon={<Car size={20} />} label="Automotivo" />
          <NavCalculatorItem mode="decorative" icon={<Home size={20} />} label="Decorativo" />
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Recursos</span>
          </div>
          <NavItem to={ROUTES.guiaTecnico} icon={<BookOpen size={20} />} label="Guia Técnico" />
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Gestão</span>
          </div>
          {user.isAdmin && (
            <>
              <NavItem to={ROUTES.admin.home} icon={<Shield size={20} />} label="Administração" />
              <NavItem to={ROUTES.admin.promotions} icon={<Megaphone size={20} />} label="Promoções" />
              <NavItem to={ROUTES.catalog} icon={<Package size={20} />} label="Catálogo Profissional" />
              <NavItem to={ROUTES.vehiclesBase} icon={<Car size={20} />} label="Base de Veículos" />
              <NavItem to={ROUTES.appliancesBase} icon={<Refrigerator size={20} />} label="Base de Eletros" />
            </>
          )}
          <NavItem to={ROUTES.orcamento} icon={<History size={20} />} label="Orçamento" />
        </nav>

        <div className="mt-auto shrink-0 p-4 border-t border-slate-900 space-y-1">
          <NavItem to={ROUTES.profile} icon={<UserIcon size={20} />} label="Perfil" />
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
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {getMobilePageTitle(calculatorMode ? location.pathname : appPath)}
            </p>
            <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase truncate">
              {calculatorMode === 'decorative'
                ? 'Decorativo'
                : calculatorMode === 'automotive'
                  ? 'Automotivo'
                  : getMobilePageSubtitle(location.pathname)}
            </p>
          </div>
        </header>

        <main
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 lg:pb-8',
            bottomExtras
              ? 'pb-[calc(8.75rem+env(safe-area-inset-bottom))]'
              : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]',
          )}
        >
          <AppMainContent user={user} />
        </main>

        {/* Mobile bottom navigation + expandable "Mais" panel */}
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
          <AnimatePresence>
            {moreOpen && (
              <motion.div
                key="more-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="border-t border-slate-800 bg-slate-950/98 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
              >
                <div className="p-3 border-b border-slate-900">
                  <label className="sr-only" htmlFor="mobile-nav-search">
                    Buscar no menu
                  </label>
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                    <input
                      id="mobile-nav-search"
                      type="search"
                      value={moreSearch}
                      onChange={(e) => setMoreSearch(e.target.value)}
                      placeholder="Buscar no menu..."
                      autoFocus
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-800 text-base sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40"
                    />
                  </div>
                </div>

                <div className="max-h-[min(50vh,360px)] overflow-y-auto p-2 space-y-1">
                  {filteredMoreItems.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-500">
                      Nenhum item encontrado.
                    </p>
                  ) : (
                    filteredMoreItems.map((item) => (
                      <MorePanelItem
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        end={item.end}
                        onNavigate={closeMore}
                      />
                    ))
                  )}

                  {(!normalizedQuery || 'sair logout'.includes(normalizedQuery)) && (
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 active:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={20} className="shrink-0" />
                      <span className="text-sm font-medium">Sair</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {bottomExtras}

          <nav
            className="flex items-stretch border-t border-slate-900 bg-slate-950/95 backdrop-blur-md"
            aria-label="Navegação principal"
          >
            <BottomNavItem
              to={ROUTES.dashboard}
              icon={<LayoutDashboard size={20} />}
              label="Início"
              end
              onClick={closeMore}
            />
            <BottomNavCalculatorItem
              mode="automotive"
              icon={<Car size={20} />}
              label="Auto"
              onClick={closeMore}
            />
            <BottomNavCalculatorItem
              mode="decorative"
              icon={<Home size={20} />}
              label="Deco"
              onClick={closeMore}
            />
            <BottomNavItem
              to={ROUTES.orcamento}
              icon={<History size={20} />}
              label="Orçamento"
              onClick={closeMore}
            />
            <BottomNavMore
              active={isMoreMenuRoute(appPath) || moreOpen}
              expanded={moreOpen}
              onClick={toggleMore}
            />
          </nav>
        </div>
      </div>

      {activePromotion && (
        <PromotionPopup promotion={activePromotion} onClose={() => setActivePromotion(null)} />
      )}
    </div>
  );
}

function NavCalculatorItem({
  mode,
  icon,
  label,
}: {
  mode: CalculatorMode;
  icon: ReactNode;
  label: string;
}) {
  const { goToCalculator, isCalculatorActive } = useCalculatorMode();
  const isActive = isCalculatorActive(mode);

  return (
    <button
      type="button"
      onClick={() => goToCalculator(mode)}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all duration-200 group',
        isActive
          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 translate-x-1'
          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
      )}
    >
      <div className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 shrink-0'}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 shrink-0" />
      )}
    </button>
  );
}

function NavItem({
  to,
  icon,
  label,
  onNavigate,
  end,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
  end?: boolean;
}) {
  const { goToRoute, isRouteActive } = useCalculatorMode();
  const isActive = isRouteActive(to, end ?? (to === ROUTES.dashboard || to === ROUTES.admin.home));

  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        goToRoute(to);
      }}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all duration-200 group',
        isActive
          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 translate-x-1'
          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
      )}
    >
      <div className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 shrink-0'}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 shrink-0" />
      )}
    </button>
  );
}

function MorePanelItem({
  to,
  icon,
  label,
  end,
  onNavigate,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onNavigate: () => void;
}) {
  const { goToRoute, isRouteActive } = useCalculatorMode();
  const isActive = isRouteActive(to, end);

  return (
    <button
      type="button"
      onClick={() => {
        onNavigate();
        goToRoute(to);
      }}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors',
        isActive
          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
          : 'text-slate-400 active:bg-slate-900',
      )}
    >
      <div className={isActive ? 'text-indigo-400' : 'text-slate-500 shrink-0'}>{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function BottomNavCalculatorItem({
  mode,
  icon,
  label,
  onClick,
}: {
  mode: CalculatorMode;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const { goToCalculator, isCalculatorActive } = useCalculatorMode();
  const isActive = isCalculatorActive(mode);

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        goToCalculator(mode);
      }}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] px-1 py-2 transition-colors',
        isActive ? 'text-indigo-400' : 'text-slate-500 active:text-slate-300',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-lg p-1 transition-colors',
          isActive && 'bg-indigo-600/15',
        )}
      >
        {icon}
      </span>
      <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{label}</span>
    </button>
  );
}

function BottomNavItem({
  to,
  icon,
  label,
  end,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
}) {
  const { goToRoute, isRouteActive } = useCalculatorMode();
  const isActive = isRouteActive(to, end ?? to === ROUTES.dashboard);

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        goToRoute(to);
      }}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] px-1 py-2 transition-colors',
        isActive ? 'text-indigo-400' : 'text-slate-500 active:text-slate-300',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-lg p-1 transition-colors',
          isActive && 'bg-indigo-600/15',
        )}
      >
        {icon}
      </span>
      <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{label}</span>
    </button>
  );
}

function BottomNavMore({
  active,
  expanded,
  onClick,
}: {
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={expanded ? 'Fechar menu' : 'Abrir menu completo'}
      aria-expanded={expanded}
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
