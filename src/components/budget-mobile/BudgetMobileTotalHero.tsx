import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { getBudgetAccentStyles, type BudgetAccent } from './budgetMobileStyles';

interface BudgetMobileTotalHeroProps {
  total: number;
  label?: string;
  accent?: BudgetAccent;
  isOverridden?: boolean;
  onChangeOverride?: (value: number | null) => void;
}

export default function BudgetMobileTotalHero({
  total,
  label = 'Investimento sugerido',
  accent = 'indigo',
  isOverridden = false,
  onChangeOverride,
}: BudgetMobileTotalHeroProps) {
  const styles = getBudgetAccentStyles(accent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = () => {
    setDraft(total ? total.toFixed(2) : '');
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (!onChangeOverride) return;
    const parsed = parseFloat(draft.replace(',', '.'));
    onChangeOverride(Number.isNaN(parsed) ? null : Math.round(parsed * 100) / 100);
  };

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
      {editing ? (
        <input
          type="number"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-full mt-1 bg-transparent text-[2.5rem] font-black text-white tracking-tighter leading-none text-center focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onChangeOverride ? startEditing : undefined}
          className="w-full mt-1 flex items-center justify-center gap-2 group"
        >
          <p className="text-[2.5rem] font-black text-white tracking-tighter leading-none">
            {formatCurrency(total)}
          </p>
          {onChangeOverride && (
            <Pencil size={16} className="text-slate-500 group-hover:text-slate-300 shrink-0" />
          )}
        </button>
      )}
      {isOverridden && onChangeOverride && !editing && (
        <button
          type="button"
          onClick={() => onChangeOverride(null)}
          className={cn('text-[10px] underline mt-2', styles.label)}
        >
          Restaurar valor sugerido
        </button>
      )}
    </div>
  );
}
