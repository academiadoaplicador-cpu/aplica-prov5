import { useState } from 'react';
import { ChevronDown, CreditCard } from 'lucide-react';
import { PaymentTerms } from '../types';
import { cn } from '../lib/utils';
import { formatPaymentMethods, hasPaymentTerms } from '../constants/paymentMethods';
import PaymentTermsEditor from './PaymentTermsEditor';

/**
 * Condições de pagamento deste orçamento. Começam com o padrão da configuração
 * (Custos); qualquer ajuste aqui vale só para este orçamento.
 */
export default function BudgetPaymentTermsPanel({
  value,
  isCustom,
  onChange,
  onReset,
  accent,
  total,
}: {
  value: PaymentTerms;
  /** O usuário já ajustou as condições neste orçamento. */
  isCustom: boolean;
  onChange: (next: PaymentTerms) => void;
  onReset: () => void;
  accent: 'indigo' | 'emerald';
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const summary = hasPaymentTerms(value)
    ? value.methods.length > 0
      ? formatPaymentMethods(value, total)
      : 'Só observações'
    : 'A definir na aprovação';

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <CreditCard
          size={16}
          className={cn('shrink-0 mt-0.5', accent === 'emerald' ? 'text-emerald-400' : 'text-indigo-400')}
        />
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-bold text-white">
            Condições de pagamento
            {isCustom && <span className="ml-1.5 font-normal text-slate-500">· só neste orçamento</span>}
          </span>
          <span className="block text-[11px] text-slate-400 mt-0.5 line-clamp-2">{summary}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-800/80 pt-3">
          <PaymentTermsEditor value={value} onChange={onChange} accent={accent} total={total} />
          <p className="text-[11px] text-slate-500">
            Aparece no PDF deste orçamento. O padrão dos próximos fica em Custos.
            {isCustom && (
              <>
                {' '}
                <button type="button" onClick={onReset} className="underline hover:text-slate-300">
                  Voltar ao padrão
                </button>
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
