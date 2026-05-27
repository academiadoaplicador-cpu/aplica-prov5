export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado: string;
  regiao: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export interface ApplicatorAddress {
  cep: string;
  street: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  stateName: string;
  stateCode: string;
  region: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  addressUnit: string;
  viacepComplement: string;
}

export const emptyApplicatorAddress = (): ApplicatorAddress => ({
  cep: '',
  street: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  stateName: '',
  stateCode: '',
  region: '',
  ibge: '',
  gia: '',
  ddd: '',
  siafi: '',
  addressUnit: '',
  viacepComplement: '',
});

export function formatCepInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function buildAddressSummary(a: ApplicatorAddress): string {
  const parts: string[] = [];
  const streetLine = [a.street, a.addressNumber].filter(Boolean).join(', ');
  if (streetLine) parts.push(streetLine);
  if (a.addressComplement.trim()) parts.push(a.addressComplement.trim());
  const cityLine = [a.neighborhood, a.city].filter(Boolean).join(' - ');
  if (cityLine) parts.push(a.stateCode ? `${cityLine}/${a.stateCode}` : cityLine);
  if (a.cep) parts.unshift(`CEP ${formatCepInput(a.cep)}`);
  return parts.join(' — ');
}
