import { ApplicatorAddress, emptyApplicatorAddress } from '../types/address';
import { ApplicatorProfile } from '../types';

export function profileToAddress(p: ApplicatorProfile): ApplicatorAddress {
  const base = emptyApplicatorAddress();
  return {
    ...base,
    cep: p.cep || '',
    street: p.street || '',
    addressNumber: p.addressNumber || '',
    addressComplement: p.addressComplement || '',
    neighborhood: p.neighborhood || '',
    city: p.city || '',
    stateName: p.stateName || '',
    stateCode: p.stateCode || '',
    region: p.region || '',
    ibge: p.ibge || '',
    gia: p.gia || '',
    ddd: p.ddd || '',
    siafi: p.siafi || '',
    addressUnit: p.addressUnit || '',
    viacepComplement: p.viacepComplement || '',
  };
}

export function mergeAddressIntoProfile(
  profile: ApplicatorProfile,
  address: ApplicatorAddress,
): ApplicatorProfile {
  return {
    ...profile,
    ...address,
    address: profile.address,
  };
}
