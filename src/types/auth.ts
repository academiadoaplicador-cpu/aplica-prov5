import { ApplicatorProfile } from './index';

export interface RegisterPayload {
  businessName: string;
  email: string;
  password: string;
  profile: Omit<ApplicatorProfile, 'id' | 'rating' | 'verifiedDocuments'> & {
    verifiedDocuments?: boolean;
  };
}
