-- Schema inicial do Aplica PRO
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE financial_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 50,
  profit_margin_percentage NUMERIC(5, 2) NOT NULL DEFAULT 30,
  tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 6,
  fixed_costs NUMERIC(10, 2) NOT NULL DEFAULT 1500
);

CREATE TABLE materials (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price_per_m2 NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL,
  line TEXT NOT NULL,
  color_texture TEXT NOT NULL,
  durability TEXT NOT NULL,
  application_difficulty NUMERIC(4, 2),
  recommended_for TEXT[] NOT NULL DEFAULT '{}',
  details TEXT,
  roll_width_m NUMERIC(10, 3),
  roll_length_m NUMERIC(10, 3),
  roll_widths_m JSONB,
  roll_lengths_m JSONB,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE vehicles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT NOT NULL,
  size TEXT NOT NULL,
  part_measurements JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE appliances (
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

CREATE TABLE applicator_profiles (
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

CREATE TABLE budgets (
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
  vehicle_quantity INTEGER NOT NULL DEFAULT 1,
  rolls_needed INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX idx_budgets_user_date ON budgets (user_id, date DESC);
CREATE INDEX idx_materials_user ON materials (user_id);

CREATE TABLE suppliers (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT NOT NULL,
  address TEXT,
  registration_status TEXT,
  partners JSONB NOT NULL DEFAULT '[]'::jsonb,
  whatsapp TEXT,
  email TEXT,
  cep TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE supplier_contacts (
  user_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  id TEXT NOT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, supplier_id, id),
  FOREIGN KEY (user_id, supplier_id)
    REFERENCES suppliers(user_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_supplier_contacts_supplier
  ON supplier_contacts (user_id, supplier_id, state, city);

CREATE TABLE supplier_product_links (
  user_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  brand TEXT NOT NULL,
  line TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, supplier_id, brand, line),
  FOREIGN KEY (user_id, supplier_id)
    REFERENCES suppliers(user_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_supplier_links_lookup
  ON supplier_product_links (user_id, LOWER(TRIM(brand)), LOWER(TRIM(line)))
  WHERE is_primary = TRUE;
