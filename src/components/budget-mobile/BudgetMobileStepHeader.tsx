import { cn } from '../../lib/utils';
import { getBudgetAccentStyles, type BudgetAccent } from './budgetMobileStyles';

interface BudgetMobileStepHeaderProps {
  step: number;
  title: string;
  description?: string;
  accent?: BudgetAccent;
}

export default function BudgetMobileStepHeader({
  step,
  title,
  description,
  accent = 'indigo',
}: BudgetMobileStepHeaderProps) {
  const styles = getBudgetAccentStyles(accent);

  return (
    <div className="lg:hidden mb-5">
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center text-base font-black shrink-0',
            styles.badge,
          )}
        >
          {step}
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-lg font-bold text-white leading-snug tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
