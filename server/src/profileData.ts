/** Campos de perfil/endereço/telefone compartilhados entre register e update. */

export interface ProfileAddressInput {
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
  gia?: string;
  ddd?: string;
  siafi?: string;
  addressUnit?: string;
  viacepComplement?: string;
  address?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneNational?: string;
}

export function buildAddressLine(p: ProfileAddressInput): string {
  if (p.address?.trim()) return p.address.trim();
  const parts: string[] = [];
  const streetLine = [p.street, p.addressNumber].filter(Boolean).join(', ');
  if (streetLine) parts.push(streetLine);
  if (p.addressComplement?.trim()) parts.push(p.addressComplement.trim());
  const cityLine = [p.neighborhood, p.city].filter(Boolean).join(' - ');
  if (cityLine) {
    parts.push(p.stateCode ? `${cityLine}/${p.stateCode}` : cityLine);
  }
  return parts.join(' — ') || '';
}

export function buildPhoneStored(p: ProfileAddressInput): string {
  if (p.phone?.trim()) return p.phone.trim();
  const code = p.phoneCountryCode?.trim() || '+55';
  const national = (p.phoneNational || '').replace(/\D/g, '');
  if (!national) return '';
  return `${code}${national}`;
}

export function mapProfileRow(row: Record<string, unknown>) {
  return {
    id: row.user_id as string,
    photoUrl: (row.photo_url as string) || undefined,
    fullName: row.full_name as string,
    rating: Number(row.rating),
    experienceYears: Number(row.experience_years),
    phone: (row.phone as string) || '',
    phoneCountryCode: (row.phone_country_code as string) || '+55',
    phoneNational: (row.phone_national as string) || '',
    address: (row.address as string) || '',
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
    gia: (row.gia as string) || '',
    ddd: (row.ddd as string) || '',
    siafi: (row.siafi as string) || '',
    addressUnit: (row.address_unit as string) || '',
    viacepComplement: (row.viacep_complement as string) || '',
    areasOfExpertise: (row.areas_of_expertise as string[]) || [],
    verifiedDocuments: Boolean(row.verified_documents),
    documentsUrls: (row.documents_urls as string[]) || [],
  };
}

export function profileDbParams(p: ProfileAddressInput & Record<string, unknown>) {
  return [
    p.photoUrl ?? null,
    String(p.fullName ?? '').trim(),
    p.rating ?? 5,
    Math.max(0, Number(p.experienceYears) || 1),
    buildPhoneStored(p),
    p.phoneCountryCode?.trim() || '+55',
    (p.phoneNational || '').replace(/\D/g, ''),
    buildAddressLine(p),
    (p.cep || '').replace(/\D/g, ''),
    p.street?.trim() || '',
    p.addressNumber?.trim() || '',
    p.addressComplement?.trim() || '',
    p.neighborhood?.trim() || '',
    p.city?.trim() || '',
    p.stateName?.trim() || '',
    p.stateCode?.trim() || '',
    p.region?.trim() || '',
    p.ibge?.trim() || '',
    p.gia?.trim() || '',
    p.ddd?.trim() || '',
    p.siafi?.trim() || '',
    p.addressUnit?.trim() || '',
    p.viacepComplement?.trim() || '',
    p.areasOfExpertise || [],
    p.verifiedDocuments ?? false,
    p.documentsUrls || [],
  ];
}

export const PROFILE_INSERT_SQL = `INSERT INTO applicator_profiles (
  user_id, photo_url, full_name, rating, experience_years,
  phone, phone_country_code, phone_national, address,
  cep, street, address_number, address_complement, neighborhood, city,
  state_name, state_code, region, ibge, gia, ddd, siafi, address_unit, viacep_complement,
  areas_of_expertise, verified_documents, documents_urls
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`;

export const PROFILE_UPSERT_SQL = `${PROFILE_INSERT_SQL}
ON CONFLICT (user_id) DO UPDATE SET
  photo_url = EXCLUDED.photo_url,
  full_name = EXCLUDED.full_name,
  rating = EXCLUDED.rating,
  experience_years = EXCLUDED.experience_years,
  phone = EXCLUDED.phone,
  phone_country_code = EXCLUDED.phone_country_code,
  phone_national = EXCLUDED.phone_national,
  address = EXCLUDED.address,
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
  gia = EXCLUDED.gia,
  ddd = EXCLUDED.ddd,
  siafi = EXCLUDED.siafi,
  address_unit = EXCLUDED.address_unit,
  viacep_complement = EXCLUDED.viacep_complement,
  areas_of_expertise = EXCLUDED.areas_of_expertise,
  verified_documents = EXCLUDED.verified_documents,
  documents_urls = EXCLUDED.documents_urls`;
