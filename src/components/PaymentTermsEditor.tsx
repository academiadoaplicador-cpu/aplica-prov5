import { Check } from 'lucide-react';
import { PaymentMethod, PaymentTerms } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { MAX_CREDIT_INSTALLMENTS, PAYMENT_METHODS } from '../constants/paymentMethods';

type Accent = 'indigo' | 'emerald';

const ACCENT: Record<Accent, { on: string; ring: string; segment: string }> = {
  indigo: {
    on: 'border-indigo-500/60 bg-indigo-600/15 text-indigo-200',
    ring: 'focus:ring-indigo-500',
    segment: 'bg-indigo-600 text-white',
  },
  emerald: {
    on: 'border-emerald-500/60 bg-emerald-600/15 text-emerald-200',
    ring: 'focus:ring-emerald-500',
    segment: 'bg-emerald-600 text-white',
  },
};

const INSTALLMENT_OPTIONS = Array.from({ length: MAX_CREDIT_INSTALLMENTS }, (_, i) => i + 1);

/**
 * Formas de pagamento (Pix, débito, crédito, boleto), parcelamento do crédito e
 * observações livres. Nenhuma forma é obrigatória.
 */
export default function PaymentTermsEditor({
  value,
  onChange,
  accent = 'indigo',
  total,
}: {
  value: PaymentTerms;
  onChange: (next: PaymentTerms) => void;
  accent?: Accent;
  /** Valor do orçamento, para mostrar o valor da parcela sem juros. */
  total?: number;
}) {
  const tone = ACCENT[accent];
  const hasCredit = value.methods.includes('credito');
  const installments = value.creditInstallments;

  const toggle = (method: PaymentMethod) => {
    const methods = value.methods.includes(method)
      ? value.methods.filter((m) => m !== method)
      : PAYMENT_METHODS.map((m) => m.id).filter((id) => id === method || value.methods.includes(id));
    onChange({ ...value, methods });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((method) => {
          const checked = value.methods.includes(method.id);
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => toggle(method.id)}
              aria-pressed={checked}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-semibold transition-colors',
                checked
                  ? tone.on
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700',
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                  checked ? 'border-current' : 'border-slate-600',
                )}
              >
                {checked && <Check size={12} strokeWidth={3} />}
              </span>
              {method.label}
            </button>
          );
        })}
      </div>

      {hasCredit && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
          <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
            <span>Parcelamento no crédito</span>
            <select
              value={installments}
              onChange={(e) => onChange({ ...value, creditInstallments: Number(e.target.value) })}
              className={cn(
                'bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2',
                tone.ring,
              )}
            >
              {INSTALLMENT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? 'Só à vista' : `Até ${n}x`}
                </option>
              ))}
            </select>
          </label>

          {installments > 1 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {[
                  { free: true, label: 'Sem juros' },
                  { free: false, label: 'Com juros' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => onChange({ ...value, creditInterestFree: option.free })}
                    aria-pressed={value.creditInterestFree === option.free}
                    className={cn(
                      'py-1.5 rounded-md text-xs font-bold transition-colors',
                      value.creditInterestFree === option.free
                        ? tone.segment
                        : 'text-slate-400 hover:text-white',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                {value.creditInterestFree
                  ? total && total > 0
                    ? `${installments}x de ${formatCurrency(total / installments)} sem juros.`
                    : `Em até ${installments}x sem juros.`
                  : `Em até ${installments}x, com os juros da operadora por conta do cliente.`}
              </p>
            </div>
          )}
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs text-slate-400">Observações de pagamento (opcional)</span>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          maxLength={500}
          rows={2}
          placeholder="Ex.: 50% de entrada e o restante na entrega · 5% de desconto no Pix"
          className={cn(
            'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 resize-y focus:outline-none focus:ring-2',
            tone.ring,
          )}
        />
      </label>
    </div>
  );
}
