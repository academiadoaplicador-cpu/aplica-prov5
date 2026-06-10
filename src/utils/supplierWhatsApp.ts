import { digitsOnly } from './phone';

export interface BudgetSupplierMessageContext {
  customerName: string;
  projectLabel: string;
  brand: string;
  line: string;
  areaM2?: number;
  totalPrice?: number;
  budgetType?: 'Automotivo' | 'Decorativo';
}

export function buildSupplierWhatsAppUrl(whatsapp: string, message: string): string {
  const digits = digitsOnly(whatsapp);
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function buildBudgetSupplierMessage(ctx: BudgetSupplierMessageContext): string {
  const lines = [
    'Olá! Tudo bem?',
    '',
    'Poderia verificar se vocês possuem o material abaixo?',
    '',
    `Material: ${ctx.brand} — ${ctx.line}`,
  ];

  if (ctx.areaM2 !== undefined && ctx.areaM2 > 0) {
    lines.push(`Área estimada: ${ctx.areaM2.toFixed(2)} m²`);
  }

  lines.push('', '_Aplica Pro_');
  return lines.join('\n');
}
