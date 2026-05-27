import type { Response } from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'aplica_session';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_TTL_MS = TOKEN_TTL_SECONDS * 1000;
const JWT_ALGORITHM = 'HS256';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (isProduction()) {
      throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres em produção');
    }
    return 'dev-only-aplica-pro-jwt-secret-change-in-production-32chars';
  }
  return secret;
}

export interface AuthTokenPayload {
  sub: string;
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AuthTokenPayload, getJwtSecret(), {
    expiresIn: TOKEN_TTL_SECONDS,
    algorithm: JWT_ALGORITHM,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  }) as AuthTokenPayload;
  if (!payload?.sub) {
    throw new Error('Token inválido');
  }
  return payload;
}

export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    maxAge: TOKEN_TTL_MS,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    path: '/',
  });
}

/**
 * Em produção aceitamos apenas o cookie httpOnly (frontend não usa Bearer).
 * Bearer fica disponível em desenvolvimento para facilitar testes.
 */
export function getTokenFromRequest(
  cookies: Record<string, string | undefined>,
  authorization?: string,
): string | null {
  const fromCookie = cookies[COOKIE_NAME];
  if (fromCookie) return fromCookie;
  if (isProduction()) return null;
  return extractBearerToken(authorization);
}
