function num(value: unknown): number {
  return Number(value);
}

const PAYMENT_METHODS = ['pix', 'debito', 'credito', 'boleto'] as const;
const MAX_CREDIT_INSTALLMENTS = 24;
const MAX_PAYMENT_NOTES = 500;

export interface PaymentTerms {
  methods: string[];
  creditInstallments: number;
  creditInterestFree: boolean;
  notes: string;
}

/**
 * Condições de pagamento válidas, ou null quando não há nada informado (o PDF
 * mostra "a definir na aprovação"). Só formas conhecidas, na ordem padrão.
 */
export function sanitizePaymentTerms(value: unknown): PaymentTerms | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requested = Array.isArray(raw.methods) ? raw.methods : [];
  const methods = PAYMENT_METHODS.filter((method) => requested.includes(method));
  const notes = typeof raw.notes === 'string' ? raw.notes.trim().slice(0, MAX_PAYMENT_NOTES) : '';
  if (methods.length === 0 && !notes) return null;
  const installments = Math.floor(Number(raw.creditInstallments));
  return {
    methods,
    creditInstallments:
      Number.isFinite(installments) && installments >= 1
        ? Math.min(MAX_CREDIT_INSTALLMENTS, installments)
        : 1,
    creditInterestFree: raw.creditInterestFree !== false,
    notes,
  };
}

export function mapFinancial(row: Record<string, unknown>) {
  return {
    hourlyRate: num(row.hourly_rate),
    profitMarginPercentage: num(row.profit_margin_percentage),
    taxPercentage: num(row.tax_percentage),
    fixedCosts: num(row.fixed_costs),
    paymentTerms: sanitizePaymentTerms(row.payment_terms) ?? undefined,
  };
}

export function mapBudget(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    vehicleModel: (row.vehicle_model as string) || undefined,
    applianceModel: (row.appliance_model as string) || undefined,
    vehicleId: (row.vehicle_id as string) || undefined,
    status: row.status as string,
    date: row.date as string,
    description: (row.description as string) || undefined,
    items: row.items as unknown[],
    materialId: row.material_id as string,
    customPricePerM2: row.custom_price_per_m2 != null ? num(row.custom_price_per_m2) : undefined,
    totalHours: num(row.total_hours),
    totalMaterialMeters: num(row.total_material_meters),
    totalMaterialM2: row.total_material_m2 != null ? num(row.total_material_m2) : undefined,
    totalCost: num(row.total_cost),
    totalPrice: num(row.total_price),
    profit: num(row.profit),
    type: row.type as string,
    subType: (row.sub_type as string) || undefined,
    vehicleQuantity:
      row.vehicle_quantity != null ? Math.max(1, num(row.vehicle_quantity)) : undefined,
    rollsNeeded:
      row.rolls_needed != null ? Math.max(1, num(row.rolls_needed)) : undefined,
    lineItems: Array.isArray(row.line_items) ? row.line_items : [],
    paymentTerms: sanitizePaymentTerms(row.payment_terms) ?? undefined,
  };
}
