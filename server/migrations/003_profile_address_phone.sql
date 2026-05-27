-- Endereço estruturado (ViaCEP) + telefone internacional
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS state_name TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS state_code TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS ibge TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS gia TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS ddd TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS siafi TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS address_unit TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS viacep_complement TEXT;
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+55';
ALTER TABLE applicator_profiles ADD COLUMN IF NOT EXISTS phone_national TEXT;
