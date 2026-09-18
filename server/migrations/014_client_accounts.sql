-- Contas de cliente final (Fase 1 do Marketplace).
-- Até aqui toda linha de `users` era um aplicador; o papel passa a ser explícito.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'applicator';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('applicator', 'client'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS client_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  phone_country_code TEXT NOT NULL DEFAULT '+55',
  phone_national TEXT NOT NULL DEFAULT '',
  cep TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  address_number TEXT NOT NULL DEFAULT '',
  address_complement TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state_name TEXT NOT NULL DEFAULT '',
  state_code TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  ibge TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usado pelo match por região: aplicadores verificados de uma cidade/UF.
CREATE INDEX IF NOT EXISTS idx_client_profiles_region
  ON client_profiles (state_code, city);
