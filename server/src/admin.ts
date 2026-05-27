import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import { seedUserData } from './seed/seedUser.js';

const SALT_ROUNDS = 10;
const DEV_ADMIN_ID = 'admin';

export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production'
  );
}

/** Credenciais admin: só via variáveis de ambiente (sem defaults em produção). */
export function getAdminEmail(): string {
  const fromEnv = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (fromEnv) return fromEnv;
  if (!isProduction()) return 'aplica-pro@admin.com.br';
  return '';
}

export function getAdminPassword(): string {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;
  if (!isProduction()) return 'admin123';
  return '';
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminEmail() && getAdminPassword());
}

export function isAdminEmail(email: string): boolean {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail;
}

export function mapUserWithRole(row: Record<string, unknown>) {
  const email = row.email as string;
  return {
    id: row.id as string,
    email,
    businessName: row.business_name as string,
    isAdmin: isAdminEmail(email),
  };
}

export async function ensureAdminUser(pool: Pool): Promise<void> {
  if (!isAdminConfigured()) {
    if (!isProduction()) {
      console.warn('[admin] ADMIN_EMAIL e ADMIN_PASSWORD não definidos.');
    }
    return;
  }

  if (isProduction() && process.env.ENABLE_ADMIN_BOOTSTRAP !== 'true') {
    return;
  }

  const email = getAdminEmail();
  const password = getAdminPassword();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const businessName =
    process.env.ADMIN_BUSINESS_NAME?.trim() || 'Gestão do Sistema';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE users SET password_hash = $1, business_name = $2 WHERE email = $3',
      [passwordHash, businessName, email],
    );
    if (!isProduction()) {
      console.log('[admin] Conta administrativa atualizada (dev).');
    }
    return;
  }

  const id = isProduction()
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : DEV_ADMIN_ID;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO users (id, email, business_name, password_hash) VALUES ($1, $2, $3, $4)',
      [id, email, businessName, passwordHash],
    );
    await seedUserData(client, id);
    await client.query('COMMIT');
    if (!isProduction()) {
      console.log('[admin] Conta administrativa criada (dev).');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function userIsAdmin(pool: Pool, userId: string): Promise<boolean> {
  const result = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) return false;
  return isAdminEmail(result.rows[0].email as string);
}

export function reservedEmailMessage(): string {
  return isProduction()
    ? 'Não foi possível concluir o cadastro com este e-mail.'
    : 'Este e-mail é reservado ao administrador do sistema.';
}
