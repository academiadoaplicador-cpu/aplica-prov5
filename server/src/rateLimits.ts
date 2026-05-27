import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/** Limita tentativas de login por IP+e-mail. Mensagem genérica para não vazar info. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip || '')}:${email}`;
  },
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

/** Limita cadastros por IP para mitigar spam de contas. */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitos cadastros a partir deste IP. Tente mais tarde.' },
});

/** Limite genérico em rotas sensíveis (logout, importações). */
export const sensitiveRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/** Tracker em memória de tentativas falhas por e-mail (defesa em camadas). */
const failedAttempts = new Map<string, { count: number; firstAt: number; lockedUntil?: number }>();
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;

function cleanup(now: number) {
  for (const [key, value] of failedAttempts) {
    if (value.lockedUntil && value.lockedUntil < now) {
      failedAttempts.delete(key);
      continue;
    }
    if (!value.lockedUntil && now - value.firstAt > FAIL_WINDOW_MS) {
      failedAttempts.delete(key);
    }
  }
}

export function isAccountLocked(email: string): number | null {
  const now = Date.now();
  cleanup(now);
  const entry = failedAttempts.get(email);
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return entry.lockedUntil;
  }
  return null;
}

export function registerFailedLogin(email: string): void {
  const now = Date.now();
  cleanup(now);
  const key = email.toLowerCase();
  const entry = failedAttempts.get(key);
  if (!entry || now - entry.firstAt > FAIL_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstAt: now });
    return;
  }
  entry.count += 1;
  if (entry.count >= MAX_FAILS) {
    entry.lockedUntil = now + LOCK_MS;
  }
}

export function clearFailedLogins(email: string): void {
  failedAttempts.delete(email.toLowerCase());
}
