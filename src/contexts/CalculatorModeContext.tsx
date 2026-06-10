import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';

export type CalculatorMode = 'automotive' | 'decorative';

type AppNavigationContextValue = {
  calculatorMode: CalculatorMode | null;
  appPath: string;
  goToCalculator: (mode: CalculatorMode) => void;
  goToRoute: (path: string) => void;
  isCalculatorActive: (mode: CalculatorMode) => boolean;
  isRouteActive: (path: string, end?: boolean) => boolean;
};

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

function calculatorModeFromPath(pathname: string): CalculatorMode | null {
  if (pathname.startsWith(ROUTES.decorative)) return 'decorative';
  if (pathname.startsWith(ROUTES.automotive)) return 'automotive';
  return null;
}

function pathForCalculatorMode(mode: CalculatorMode): string {
  return mode === 'automotive' ? ROUTES.automotive : ROUTES.decorative;
}

function isPathActive(currentPath: string, target: string, end = false): boolean {
  if (end || target === ROUTES.dashboard) {
    return currentPath === target;
  }
  return currentPath === target || currentPath.startsWith(`${target}/`);
}

export function CalculatorModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode | null>(() =>
    calculatorModeFromPath(window.location.pathname),
  );
  const [appPath, setAppPath] = useState(() => window.location.pathname);

  useEffect(() => {
    setAppPath(location.pathname);
    setCalculatorMode(calculatorModeFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const syncFromBrowser = () => {
      const path = window.location.pathname;
      setAppPath(path);
      setCalculatorMode(calculatorModeFromPath(path));
    };
    window.addEventListener('popstate', syncFromBrowser);
    return () => window.removeEventListener('popstate', syncFromBrowser);
  }, []);

  const goToCalculator = useCallback(
    (next: CalculatorMode) => {
      const path = pathForCalculatorMode(next);
      setCalculatorMode(next);
      setAppPath(path);
      navigate(path);
    },
    [navigate],
  );

  const goToRoute = useCallback(
    (path: string) => {
      setCalculatorMode(null);
      setAppPath(path);
      navigate(path);
    },
    [navigate],
  );

  const isCalculatorActive = useCallback(
    (target: CalculatorMode) => calculatorMode === target,
    [calculatorMode],
  );

  const isRouteActive = useCallback(
    (path: string, end = false) => calculatorMode === null && isPathActive(appPath, path, end),
    [appPath, calculatorMode],
  );

  const value = useMemo(
    () => ({
      calculatorMode,
      appPath,
      goToCalculator,
      goToRoute,
      isCalculatorActive,
      isRouteActive,
    }),
    [calculatorMode, appPath, goToCalculator, goToRoute, isCalculatorActive, isRouteActive],
  );

  return (
    <AppNavigationContext.Provider value={value}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useCalculatorMode() {
  const ctx = useContext(AppNavigationContext);
  if (!ctx) {
    throw new Error('useCalculatorMode must be used within CalculatorModeProvider');
  }

  return {
    mode: ctx.calculatorMode,
    appPath: ctx.appPath,
    goToCalculator: ctx.goToCalculator,
    goToRoute: ctx.goToRoute,
    isCalculatorActive: ctx.isCalculatorActive,
    isRouteActive: ctx.isRouteActive,
  };
}
