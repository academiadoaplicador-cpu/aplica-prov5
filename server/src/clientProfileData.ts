/** Campos de perfil do cliente final, compartilhados entre cadastro e atualização. */

export interface ClientProfileInput {
  fullName?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneNational?: string;
  cep?: string;
  street?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  stateName?: string;
  stateCode?: string;
  region?: string;
  ibge?: string;
}

export function buildClientPhoneStored(p: ClientProfileInput): string {
  if (p.phone?.trim()) return p.phone.trim();
  const code = p.phoneCountryCode?.trim() || '+55';
  const national = (p.phoneNational || '').replace(/\D/g, '');
  if (!national) return '';
  return `${code}${national}`;
}

export function mapClientProfileRow(row: Record<string, unknown>) {
  return {
    id: row.user_id as string,
    fullName: row.full_name as string,
    phone: (row.phone as string) || '',
    phoneCountryCode: (row.phone_country_code as string) || '+55',
    phoneNational: (row.phone_national as string) || '',
    cep: (row.cep as string) || '',
    street: (row.street as string) || '',
    addressNumber: (row.address_number as string) || '',
    addressComplement: (row.address_complement as string) || '',
    neighborhood: (row.neighborhood as string) || '',
    city: (row.city as string) || '',
    stateName: (row.state_name as string) || '',
    stateCode: (row.state_code as string) || '',
    region: (row.region as string) || '',
    ibge: (row.ibge as string) || '',
  };
}

export function clientProfileDbParams(p: ClientProfileInput) {
  return [
    String(p.fullName ?? '').trim(),
    buildClientPhoneStored(p),
    p.phoneCountryCode?.trim() || '+55',
    (p.phoneNational || '').replace(/\D/g, ''),
    (p.cep || '').replace(/\D/g, ''),
    p.street?.trim() || '',
    p.addressNumber?.trim() || '',
    p.addressComplement?.trim() || '',
    p.neighborhood?.trim() || '',
    p.city?.trim() || '',
    p.stateName?.trim() || '',
    p.stateCode?.trim().toUpperCase() || '',
    p.region?.trim() || '',
    p.ibge?.trim() || '',
  ];
}

export const CLIENT_PROFILE_INSERT_SQL = `INSERT INTO client_profiles (
  user_id, full_name, phone, phone_country_code, phone_national,
  cep, street, address_number, address_complement, neighborhood,
  city, state_name, state_code, region, ibge
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`;

export const CLIENT_PROFILE_UPSERT_SQL = `${CLIENT_PROFILE_INSERT_SQL}
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  phone_country_code = EXCLUDED.phone_country_code,
  phone_national = EXCLUDED.phone_national,
  cep = EXCLUDED.cep,
  street = EXCLUDED.street,
  address_number = EXCLUDED.address_number,
  address_complement = EXCLUDED.address_complement,
  neighborhood = EXCLUDED.neighborhood,
  city = EXCLUDED.city,
  state_name = EXCLUDED.state_name,
  state_code = EXCLUDED.state_code,
  region = EXCLUDED.region,
  ibge = EXCLUDED.ibge,
  updated_at = NOW()`;
