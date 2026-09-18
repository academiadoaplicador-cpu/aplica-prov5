import { ApplicatorProfile } from './index';

export interface RegisterPayload {
  businessName: string;
  email: string;
  password: string;
  profile: Omit<ApplicatorProfile, 'id' | 'rating' | 'verifiedDocuments'> & {
    verifiedDocuments?: boolean;
  };
}

export interface ClientRegisterPayload {
  email: string;
  password: string;
  profile: {
    fullName: string;
    phoneCountryCode?: string;
    phoneNational?: string;
    cep: string;
    city: string;
    stateName?: string;
    stateCode: string;
    neighborhood?: string;
    street?: string;
    region?: string;
    ibge?: string;
  };
}
