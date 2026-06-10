import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

type MobileBottomExtrasContextValue = {
  extras: ReactNode | null;
  setExtras: (node: ReactNode | null) => void;
};

const MobileBottomExtrasContext = createContext<MobileBottomExtrasContextValue | null>(
  null,
);

export function MobileBottomExtrasProvider({ children }: { children: ReactNode }) {
  const [extras, setExtras] = useState<ReactNode | null>(null);
  const { pathname } = useLocation();

  const value = useMemo(
    () => ({ extras, setExtras }),
    [extras],
  );

  useEffect(() => {
    setExtras(null);
  }, [pathname]);

  return (
    <MobileBottomExtrasContext.Provider value={value}>
      {children}
    </MobileBottomExtrasContext.Provider>
  );
}

export function useMobileBottomExtras(node: ReactNode | null) {
  const ctx = useContext(MobileBottomExtrasContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setExtras(node);
    return () => ctx.setExtras(null);
  }, [ctx, node]);
}

export function useMobileBottomExtrasContent() {
  return useContext(MobileBottomExtrasContext)?.extras ?? null;
}
