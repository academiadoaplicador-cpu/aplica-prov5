import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { isAdminEmail, reservedEmailMessage } from './admin.js';
import { isValidEmail, normalizeEmail } from './email.js';
import { getPasswordValidationMessage } from './password.js';
import {
  buildClientPhoneStored,
  clientProfileDbParams,
  CLIENT_PROFILE_INSERT_SQL,
  type ClientProfileInput,
} from './clientProfileData.js';

const SALT_ROUNDS = 10;

export interface CreateClientInput {
  email: string;
  password: string;
  profile: ClientProfileInput;
}

export type CreateClientResult =
  | { ok: true; id: string; email: string; fullName: string }
  | { ok: false; status: number; error: string };

/**
 * Cliente final só precisa de nome, contato e localização — o CEP alimenta
 * o match por região, então é exigido já no cadastro e não no primeiro pedido.
 */
export function validateCreateClientInput(
  input: CreateClientInput,
): CreateClientResult | null {
  const { email, password, profile } = input;

  if (!email?.trim() || !password) {
    return { ok: false, status: 400, error: 'E-mail e senha são obrigatórios' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Informe um e-mail válido' };
  }
  const passwordError = getPasswordValidationMessage(password);
  if (passwordError) {
    return { ok: false, status: 400, error: passwordError };
  }

  const fullName = profile?.fullName?.trim() || '';
  if (!fullName) {
    return { ok: false, status: 400, error: 'Informe seu nome completo' };
  }
  if (fullName.length > 120) {
    return { ok: false, status: 400, error: 'Nome muito longo' };
  }

  if (!buildClientPhoneStored(profile || {})) {
    return { ok: false, status: 400, error: 'Informe um telefone para contato' };
  }

  const cepDigits = (profile?.cep || '').replace(/\D/g, '');
  if (cepDigits.length !== 8) {
    return { ok: false, status: 400, error: 'Informe um CEP válido (8 dígitos)' };
  }
  if (!profile?.city?.trim() || !profile?.stateCode?.trim()) {
    return { ok: false, status: 400, error: 'Cidade e UF são obrigatórios' };
  }

  if (isAdminEmail(normalizeEmail(email))) {
    return { ok: false, status: 403, error: reservedEmailMessage() };
  }

  return null;
}

export async function createClientUser(
  client: PoolClient,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const validationError = validateCreateClientInput(input);
  if (validationError) return validationError;

  const normalizedEmail = normalizeEmail(input.email);
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [
    normalizedEmail,
  ]);
  if (existing.rows.length > 0) {
    return { ok: false, status: 409, error: 'Já existe uma conta com este e-mail.' };
  }

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const fullName = input.profile.fullName!.trim();

  // `business_name` é NOT NULL e serve de rótulo da conta em telas compartilhadas
  // com o aplicador; para o cliente final o rótulo é o próprio nome.
  await client.query(
    `INSERT INTO users (id, email, business_name, password_hash, is_active, role)
     VALUES ($1, $2, $3, $4, TRUE, 'client')`,
    [id, normalizedEmail, fullName, passwordHash],
  );

  await client.query(CLIENT_PROFILE_INSERT_SQL, [
    id,
    ...clientProfileDbParams(input.profile),
  ]);

  return { ok: true, id, email: normalizedEmail, fullName };
}
