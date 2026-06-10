CREATE TABLE IF NOT EXISTS suppliers (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  cep TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS supplier_product_links (
  user_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  brand TEXT NOT NULL,
  line TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, supplier_id, brand, line),
  FOREIGN KEY (user_id, supplier_id)
    REFERENCES suppliers(user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_supplier_links_lookup
  ON supplier_product_links (user_id, LOWER(TRIM(brand)), LOWER(TRIM(line)))
  WHERE is_primary = TRUE;
