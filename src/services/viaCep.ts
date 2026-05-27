import { ApplicatorAddress, ViaCepResponse } from '../types/address';

export async function fetchAddressByCep(cep: string): Promise<ApplicatorAddress | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;

  const data = (await res.json()) as ViaCepResponse;
  if (data.erro) return null;

  return {
    cep: digits,
    street: data.logradouro || '',
    addressNumber: '',
    addressComplement: '',
    neighborhood: data.bairro || '',
    city: data.localidade || '',
    stateName: data.estado || '',
    stateCode: data.uf || '',
    region: data.regiao || '',
    ibge: data.ibge || '',
    gia: data.gia || '',
    ddd: data.ddd || '',
    siafi: data.siafi || '',
    addressUnit: data.unidade || '',
    viacepComplement: data.complemento || '',
  };
}
