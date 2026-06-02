import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { getBudgetAccentStyles, type BudgetAccent } from './budget-mobile/budgetMobileStyles';

export type BudgetFlowStep = {
  id: string;
  label: string;
  shortLabel: string;
  complete: boolean;
};

interface BudgetFlowStepperProps {
  steps: BudgetFlowStep[];
  activeStep: number;
  onStepChange: (index: number) => void;
  canGoToStep: (index: number) => boolean;
  accent?: BudgetAccent;
}

export default function BudgetFlowStepper({
  steps,
  activeStep,
  onStepChange,
  canGoToStep,
  accent = 'indigo',
}: BudgetFlowStepperProps) {
  const styles = getBudgetAccentStyles(accent);
  const progressPct = steps.length > 1 ? (activeStep / (steps.length - 1)) * 100 : 0;

  return (
    <div className="lg:hidden shrink-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-3 mb-3">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className={cn('text-[10px] font-mono uppercase tracking-widest font-semibold', styles.label)}>
            Novo orçamento
          </p>
          <span className="text-[10px] font-mono text-slate-500 tabular-nums">
            {activeStep + 1}/{steps.length}
          </span>
        </div>

        <div className="relative mb-4">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-800 rounded-full" />
          <div
            className={cn('absolute top-4 left-4 h-0.5 rounded-full transition-all duration-300', styles.progressFill)}
            style={{ width: `calc((100% - 2rem) * ${progressPct / 100})` }}
          />
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const isCurrent = index === activeStep;
              const isPast = step.complete && !isCurrent;
              const reachable = canGoToStep(index);

              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!reachable}
                  aria-label={`Etapa ${index + 1}: ${step.shortLabel}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => onStepChange(index)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 min-w-0 flex-1 disabled:cursor-not-allowed',
                    !reachable && 'opacity-35',
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition-all',
                      isCurrent && cn(styles.stepActive, 'border-transparent scale-110 shadow-lg ring-2', styles.ring),
                      isPast && 'bg-emerald-600/25 text-emerald-400 border-emerald-500/40',
                      !isCurrent && !isPast && reachable && 'bg-slate-900 text-slate-500 border-slate-700',
                      !reachable && 'bg-slate-950 text-slate-600 border-slate-800',
                    )}
                  >
                    {isPast ? <Check size={14} strokeWidth={3} /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-medium truncate max-w-full px-0.5',
                      isCurrent ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-600',
                    )}
                  >
                    {step.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-snug border-t border-slate-800/80 pt-3">
          {steps[activeStep]?.label}
        </p>
      </div>
    </div>
  );
}
