import type { PaymentMethod, PaymentTerms } from '../types';
import { formatCurrency } from '../lib/utils';

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'debito', label: 'Cartão de débito' },
  { id: 'credito', label: 'Cartão de crédito' },
  { id: 'boleto', label: 'Boleto' },
];

export const MAX_CREDIT_INSTALLMENTS = 24;

export const EMPTY_PAYMENT_TERMS: PaymentTerms = {
  methods: [],
  creditInstallments: 1,
  creditInterestFree: true,
  notes: '',
};

/** Aceita o que vier da API ou do rascunho e devolve condições válidas. */
export function normalizePaymentTerms(value: unknown): PaymentTerms {
  if (!value || typeof value !== 'object') return EMPTY_PAYMENT_TERMS;
  const raw = value as Partial<Record<keyof PaymentTerms, unknown>>;
  const methods = Array.isArray(raw.methods) ? raw.methods : [];
  const installments = Math.floor(Number(raw.creditInstallments));
  return {
    methods: PAYMENT_METHODS.map((m) => m.id).filter((id) => methods.includes(id)),
    creditInstallments:
      Number.isFinite(installments) && installments >= 1
        ? Math.min(MAX_CREDIT_INSTALLMENTS, installments)
        : 1,
    creditInterestFree: raw.creditInterestFree !== false,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
}

/** Há algo para mostrar ao cliente (forma escolhida ou observação). */
export function hasPaymentTerms(terms: PaymentTerms | undefined): terms is PaymentTerms {
  return Boolean(terms && (terms.methods.length > 0 || terms.notes.trim()));
}

/** "cartão de crédito em até 6x sem juros (6x de R$ 250,00)". */
function creditLabel(terms: PaymentTerms, total?: number): string {
  const n = terms.creditInstallments;
  if (n <= 1) return 'cartão de crédito à vista';
  if (!terms.creditInterestFree) return `cartão de crédito em até ${n}x (com juros da operadora)`;
  const perInstallment =
    total !== undefined && total > 0 ? ` (${n}x de ${formatCurrency(total / n)})` : '';
  return `cartão de crédito em até ${n}x sem juros${perInstallment}`;
}

/**
 * Uma linha por forma escolhida, na ordem padrão, para listas (PDF): o crédito
 * leva o parcelamento em `detail`.
 */
export function paymentMethodLines(
  terms: PaymentTerms,
  total?: number,
): { label: string; detail?: string }[] {
  return PAYMENT_METHODS.filter((m) => terms.methods.includes(m.id)).map((m) => {
    if (m.id !== 'credito') return { label: m.label };
    const n = terms.creditInstallments;
    if (n <= 1) return { label: m.label, detail: 'à vista' };
    if (!terms.creditInterestFree) return { label: m.label, detail: `em até ${n}x (com juros da operadora)` };
    const perInstallment = total !== undefined && total > 0 ? ` · ${n}x de ${formatCurrency(total / n)}` : '';
    return { label: m.label, detail: `em até ${n}x sem juros${perInstallment}` };
  });
}

function joinWithE(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/**
 * Formas aceitas numa frase, na ordem padrão: "Pix, cartão de débito e cartão
 * de crédito em até 6x sem juros". Com `total`, mostra o valor da parcela.
 */
export function formatPaymentMethods(terms: PaymentTerms | undefined, total?: number): string {
  if (!terms) return '';
  const parts = PAYMENT_METHODS.filter((m) => terms.methods.includes(m.id)).map((m) =>
    m.id === 'credito' ? creditLabel(terms, total) : m.id === 'pix' ? 'Pix' : m.label.toLowerCase(),
  );
  const sentence = joinWithE(parts);
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
