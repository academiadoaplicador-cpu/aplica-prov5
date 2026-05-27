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
