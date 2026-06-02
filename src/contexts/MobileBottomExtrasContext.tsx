import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type MobileBottomExtrasContextValue = {
  extras: ReactNode | null;
  setExtras: (node: ReactNode | null) => void;
};

const MobileBottomExtrasContext = createContext<MobileBottomExtrasContextValue | null>(
  null,
);

export function MobileBottomExtrasProvider({ children }: { children: ReactNode }) {
  const [extras, setExtras] = useState<ReactNode | null>(null);

  return (
    <MobileBottomExtrasContext.Provider value={{ extras, setExtras }}>
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
