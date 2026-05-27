/** Validação pragmática de e-mail (formato), alinhada ao backend. */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value || value.length > 254) return false;
  if (!EMAIL_FORMAT.test(value)) return false;

  const [local, domain] = value.split('@');
  if (!local || !domain || local.length > 64) return false;
  if (local.includes('..') || domain.includes('..')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2 || !/^[a-zA-Z]{2,}$/.test(tld)) return false;

  return true;
}

/** Mensagem em português para formulários; `null` se válido. */
export function getEmailValidationMessage(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Informe o e-mail';
  if (!isValidEmail(value)) return 'Informe um e-mail válido';
  return null;
}
