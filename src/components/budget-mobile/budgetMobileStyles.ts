import { cn } from '../../lib/utils';

export type BudgetAccent = 'indigo' | 'emerald';

const accentMap = {
  indigo: {
    badge: 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30',
    panelBorder: 'border-indigo-500/20 shadow-indigo-950/25',
    panelGlow: 'from-indigo-500/5',
    label: 'text-indigo-400',
    progressFill: 'bg-indigo-500',
    ring: 'ring-indigo-500/40',
    stepActive: 'bg-indigo-600 text-white',
  },
  emerald: {
    badge: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30',
    panelBorder: 'border-emerald-500/20 shadow-emerald-950/25',
    panelGlow: 'from-emerald-500/5',
    label: 'text-emerald-400',
    progressFill: 'bg-emerald-500',
    ring: 'ring-emerald-500/40',
    stepActive: 'bg-emerald-600 text-white',
  },
} as const;

export function getBudgetAccentStyles(accent: BudgetAccent) {
  return accentMap[accent];
}

/** Card de etapa — mobile polido; desktop mantém estilo original via lg: */
export function mobileStepPanelClass(accent: BudgetAccent, visibilityClass: string) {
  const a = getBudgetAccentStyles(accent);
  return cn(
    visibilityClass,
    'rounded-2xl border p-5 sm:p-6',
    'bg-gradient-to-b to-slate-950 lg:bg-slate-900/50',
    a.panelGlow,
    a.panelBorder,
    'shadow-lg lg:shadow-sm lg:border-slate-800',
  );
}

export const mobileFieldLabel =
  'block text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1.5';

export const mobileFieldInput = cn(
  'w-full h-12 lg:h-10 rounded-xl px-4',
  'bg-slate-950/90 lg:bg-slate-950 border border-slate-700/70 lg:border-slate-800',
  'text-base lg:text-sm text-white placeholder:text-slate-600',
  'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent',
);

export const mobileSelectInput = cn(
  mobileFieldInput,
  'appearance-none pl-3 pr-11 min-w-0',
);
