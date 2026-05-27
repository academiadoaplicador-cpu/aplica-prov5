import type { Response } from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'aplica_session';
const TOKEN_TTL = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
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
    expiresIn: TOKEN_TTL,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
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
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

export function getTokenFromRequest(cookies: Record<string, string | undefined>, authorization?: string): string | null {
  return cookies[COOKIE_NAME] || extractBearerToken(authorization) || null;
}
