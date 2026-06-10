import { digitsOnlyCnpj } from './cnpj.js';

const BRASIL_API_BASE = 'https://brasilapi.com.br/api/cnpj/v1';

export interface BrasilApiPartner {
  nome_socio: string;
  qualificacao_socio: string;
}

export interface BrasilApiCnpjRaw {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  descricao_tipo_de_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  email?: string | null;
  qsa?: BrasilApiPartner[];
  message?: string;
  type?: string;
}

export interface CnpjLookupResult {
  legalName: string;
  tradeName: string;
  address: string;
  registrationStatus: string;
  email?: string;
  city?: string;
  state?: string;
  partners: { name: string; role: string }[];
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return cep;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}-${digits.slice(5)}`;
}

export function formatAddressFromBrasilApi(data: BrasilApiCnpjRaw): string {
  const streetName = [clean(data.descricao_tipo_de_logradouro), clean(data.logradouro)]
    .filter(Boolean)
    .join(' ');
  const street = [streetName, clean(data.numero)].filter(Boolean).join(', ');
  const parts = [
    street,
    clean(data.complemento),
    clean(data.bairro),
    [clean(data.municipio), clean(data.uf)].filter(Boolean).join(' - '),
    data.cep ? formatCep(String(data.cep)) : '',
  ].filter(Boolean);

  return parts.join(' · ');
}

export function mapBrasilApiToCnpjLookup(data: BrasilApiCnpjRaw): CnpjLookupResult {
  const partners = Array.isArray(data.qsa)
    ? data.qsa
        .map((item) => ({
          name: clean(item.nome_socio),
          role: clean(item.qualificacao_socio),
        }))
        .filter((item) => item.name)
    : [];

  const email = clean(data.email ?? '');

  return {
    legalName: clean(data.razao_social),
    tradeName: clean(data.nome_fantasia),
    address: formatAddressFromBrasilApi(data),
    registrationStatus: clean(data.descricao_situacao_cadastral),
    email: email || undefined,
    city: clean(data.municipio) || undefined,
    state: clean(data.uf).toUpperCase() || undefined,
    partners,
  };
}

export async function fetchCnpjLookup(cnpj: string): Promise<CnpjLookupResult> {
  const digits = digitsOnlyCnpj(cnpj);
  if (digits.length !== 14) {
    throw new Error('CNPJ inválido');
  }

  const response = await fetch(`${BRASIL_API_BASE}/${digits}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AplicaPro/1.0',
    },
  });

  if (response.status === 404) {
    throw new Error('CNPJ não encontrado na Receita Federal.');
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Limite de consultas atingido. Aguarde um momento e tente novamente.');
    }
    throw new Error('Não foi possível consultar o CNPJ agora.');
  }

  const data = (await response.json()) as BrasilApiCnpjRaw;

  const mapped = mapBrasilApiToCnpjLookup(data);
  if (!mapped.legalName) {
    throw new Error('Resposta da Brasil API sem razão social.');
  }

  return mapped;
}
