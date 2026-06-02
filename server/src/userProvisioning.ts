import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { isAdminEmail, reservedEmailMessage } from './admin.js';
import { isValidEmail, normalizeEmail } from './email.js';
import { getPasswordValidationMessage } from './password.js';
import {
  buildAddressLine,
  buildPhoneStored,
  profileDbParams,
  PROFILE_INSERT_SQL,
  type ProfileAddressInput,
} from './profileData.js';
import { seedUserFinancialSettings } from './seed/seedUser.js';

const SALT_ROUNDS = 10;
const MAX_PROFILE_PHOTO_LENGTH = 280_000;

export interface CreateApplicatorInput {
  businessName: string;
  email: string;
  password: string;
  createdBy?: string | null;
  profile: ProfileAddressInput & {
    fullName?: string;
    experienceYears?: number;
    areasOfExpertise?: string[];
    photoUrl?: string;
    documentsUrls?: string[];
    verifiedDocuments?: boolean;
    rating?: number;
  };
  /** Cadastro pelo admin: endereço completo opcional */
  relaxedAddress?: boolean;
}

export type CreateApplicatorResult =
  | { ok: true; id: string; email: string; businessName: string }
  | { ok: false; status: number; error: string };

export function validateCreateApplicatorInput(
  input: CreateApplicatorInput,
): CreateApplicatorResult | null {
  const { businessName, email, password, profile } = input;

  if (!businessName?.trim() || !email?.trim() || !password) {
    return { ok: false, status: 400, error: 'Empresa, e-mail e senha são obrigatórios' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Informe um e-mail válido' };
  }
  const passwordError = getPasswordValidationMessage(password);
  if (passwordError) {
    return { ok: false, status: 400, error: passwordError };
  }
  if (businessName.length > 120 || (profile?.fullName?.length ?? 0) > 120) {
    return { ok: false, status: 400, error: 'Nome muito longo' };
  }

  const phoneStored = buildPhoneStored(profile || {});
  if (!profile?.fullName?.trim() || !phoneStored) {
    return { ok: false, status: 400, error: 'Preencha nome e telefone do aplicador' };
  }

  if (!input.relaxedAddress) {
    if (!profile?.street?.toString().trim() || !profile?.neighborhood?.toString().trim()) {
      return { ok: false, status: 400, error: 'Preencha o endereço (CEP, rua e bairro)' };
    }
    if (!profile?.city?.toString().trim() || !profile?.stateCode?.toString().trim()) {
      return { ok: false, status: 400, error: 'Cidade e UF são obrigatórios' };
    }
  }

  if (!profile.areasOfExpertise?.length) {
    return { ok: false, status: 400, error: 'Selecione ao menos uma área de especialidade' };
  }

  if (profile.photoUrl && profile.photoUrl.length > MAX_PROFILE_PHOTO_LENGTH) {
    return {
      ok: false,
      status: 400,
      error:
        'A foto/logo é muito grande. Use uma imagem menor (recomendado até 200 KB).',
    };
  }

  const normalizedEmail = normalizeEmail(email);
  if (isAdminEmail(normalizedEmail)) {
    return { ok: false, status: 403, error: reservedEmailMessage() };
  }

  return null;
}

export async function createApplicatorUser(
  client: PoolClient,
  input: CreateApplicatorInput,
): Promise<CreateApplicatorResult> {
  const validationError = validateCreateApplicatorInput(input);
  if (validationError) return validationError;

  const normalizedEmail = normalizeEmail(input.email);
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    return {
      ok: false,
      status: 409,
      error: 'Já existe uma conta com este e-mail.',
    };
  }

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const { profile } = input;

  const phoneStored = buildPhoneStored(profile);
  const addressLine =
    buildAddressLine(profile) ||
    [profile.city, profile.stateCode].filter(Boolean).join('/') ||
    'Endereço pendente';

  await client.query(
    `INSERT INTO users (id, email, business_name, password_hash, is_active, created_by)
     VALUES ($1, $2, $3, $4, TRUE, $5)`,
    [
      id,
      normalizedEmail,
      input.businessName.trim(),
      passwordHash,
      input.createdBy ?? null,
    ],
  );

  await seedUserFinancialSettings(client, id);

  const hasDocuments = (profile.documentsUrls?.length ?? 0) > 0;
  const profileRow = {
    ...profile,
    fullName: profile.fullName!.trim(),
    rating: profile.rating ?? 5,
    experienceYears: profile.experienceYears ?? 1,
    phone: phoneStored,
    address: addressLine,
    verifiedDocuments: profile.verifiedDocuments ?? hasDocuments,
    documentsUrls: profile.documentsUrls ?? [],
  };
  await client.query(PROFILE_INSERT_SQL, [id, ...profileDbParams(profileRow)]);

  return {
    ok: true,
    id,
    email: normalizedEmail,
    businessName: input.businessName.trim(),
  };
}

export async function hashPassword(password: string): Promise<string | null> {
  const passwordError = getPasswordValidationMessage(password);
  if (passwordError) return null;
  return bcrypt.hash(password, SALT_ROUNDS);
}
