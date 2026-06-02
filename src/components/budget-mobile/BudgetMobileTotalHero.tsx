import { formatCurrency, cn } from '../../lib/utils';
import { getBudgetAccentStyles, type BudgetAccent } from './budgetMobileStyles';

interface BudgetMobileTotalHeroProps {
  total: number;
  label?: string;
  accent?: BudgetAccent;
}

export default function BudgetMobileTotalHero({
  total,
  label = 'Investimento sugerido',
  accent = 'indigo',
}: BudgetMobileTotalHeroProps) {
  const styles = getBudgetAccentStyles(accent);

  return (
    <div
      className={cn(
        'lg:hidden rounded-2xl border p-6 text-center',
        accent === 'indigo'
          ? 'bg-indigo-600/10 border-indigo-500/25 shadow-inner shadow-indigo-950/30'
          : 'bg-emerald-600/10 border-emerald-500/25 shadow-inner shadow-emerald-950/30',
      )}
    >
      <p className={cn('text-[10px] font-mono uppercase tracking-widest font-bold', styles.label)}>
        {label}
      </p>
      <p className="text-[2.5rem] font-black text-white tracking-tighter mt-1 leading-none">
        {formatCurrency(total)}
      </p>
    </div>
  );
}
