import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { getBudgetAccentStyles, type BudgetAccent } from './budget-mobile/budgetMobileStyles';

interface BudgetWizardNavBarProps {
  activeStep: number;
  totalSteps: number;
  stepLabel: string;
  total: number;
  showTotal: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  accent?: BudgetAccent;
}

export default function BudgetWizardNavBar({
  activeStep,
  totalSteps,
  stepLabel,
  total,
  showTotal,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  accent = 'indigo',
}: BudgetWizardNavBarProps) {
  const isLastStep = activeStep === totalSteps - 1;
  const styles = getBudgetAccentStyles(accent);

  return (
    <div
      className="border-t border-slate-800/90 bg-slate-950/98 backdrop-blur-md px-3 py-2.5"
      aria-live="polite"
    >
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed active:scale-95 transition-all"
          aria-label="Etapa anterior"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="flex-1 min-w-0 flex flex-col justify-center items-center px-1 py-0.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          {showTotal ? (
            <>
              <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 truncate w-full text-center">
                {stepLabel}
              </p>
              <p className="text-xl font-black text-white tracking-tight tabular-nums">
                {formatCurrency(total)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                Etapa {activeStep + 1} de {totalSteps}
              </p>
              <p className="text-sm font-semibold text-white truncate w-full text-center">{stepLabel}</p>
            </>
          )}
        </div>

        {!isLastStep ? (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              'shrink-0 flex items-center justify-center gap-1 min-w-[5.5rem] h-11 px-3 rounded-xl text-sm font-bold text-white',
              'active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
              accent === 'emerald'
                ? 'bg-emerald-600 shadow-lg shadow-emerald-950/40 disabled:bg-slate-800 disabled:shadow-none'
                : 'bg-indigo-600 shadow-lg shadow-indigo-950/40 disabled:bg-slate-800 disabled:shadow-none',
            )}
          >
            Próximo
            <ChevronRight size={18} className="shrink-0" />
          </button>
        ) : (
          <div
            className={cn(
              'shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border',
              styles.badge,
            )}
            aria-hidden
          >
            <Check size={18} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {!isLastStep && !canGoNext && (
        <p className="text-[10px] text-slate-500 text-center mt-2 leading-snug">
          Preencha os campos desta etapa para continuar
        </p>
      )}
    </div>
  );
}
