-- Schema inicial (idempotente — funciona mesmo se init.sql do Postgres não rodou)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 50,
  profit_margin_percentage NUMERIC(5, 2) NOT NULL DEFAULT 30,
  tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 6,
  fixed_costs NUMERIC(10, 2) NOT NULL DEFAULT 1500
);

CREATE TABLE IF NOT EXISTS materials (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price_per_m2 NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL,
  line TEXT NOT NULL,
  color_texture TEXT NOT NULL,
  durability TEXT NOT NULL,
  recommended_for TEXT[] NOT NULL DEFAULT '{}',
  details TEXT,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS vehicles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT NOT NULL,
  size TEXT NOT NULL,
  part_measurements JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS appliances (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  type TEXT NOT NULL,
  width NUMERIC(10, 4) NOT NULL,
  height NUMERIC(10, 4) NOT NULL,
  depth NUMERIC(10, 4) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS applicator_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT,
  full_name TEXT NOT NULL,
  rating NUMERIC(2, 1) NOT NULL DEFAULT 5,
  experience_years INT NOT NULL DEFAULT 1,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  areas_of_expertise TEXT[] NOT NULL DEFAULT '{}',
  verified_documents BOOLEAN NOT NULL DEFAULT FALSE,
  documents_urls TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS budgets (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  vehicle_model TEXT,
  appliance_model TEXT,
  vehicle_id TEXT,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  material_id TEXT NOT NULL,
  custom_price_per_m2 NUMERIC(10, 2),
  total_hours NUMERIC(10, 2) NOT NULL,
  total_material_meters NUMERIC(10, 2) NOT NULL,
  total_material_m2 NUMERIC(10, 2),
  total_cost NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  profit NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL,
  sub_type TEXT,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_date ON budgets (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials (user_id);
