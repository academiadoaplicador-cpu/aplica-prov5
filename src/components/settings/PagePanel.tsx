import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PagePanelProps {
  children: ReactNode;
  className?: string;
}

/** Painel de conteúdo abaixo do cabeçalho (lista, formulários, etc.) */
export default function PagePanel({ children, className }: PagePanelProps) {
  return (
    <section className={cn('rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden', className)}>
      {children}
    </section>
  );
}
