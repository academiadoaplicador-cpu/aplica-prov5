ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS cnpj TEXT;

UPDATE suppliers
SET legal_name = name
WHERE legal_name IS NULL OR TRIM(legal_name) = '';

UPDATE suppliers
SET cnpj = '00000000000000'
WHERE cnpj IS NULL OR TRIM(cnpj) = '';

CREATE TABLE IF NOT EXISTS supplier_contacts (
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

INSERT INTO supplier_contacts (user_id, supplier_id, id, city, state, whatsapp)
SELECT
  s.user_id,
  s.id,
  SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 12),
  'Não informada',
  'NA',
  s.whatsapp
FROM suppliers s
WHERE s.whatsapp IS NOT NULL
  AND TRIM(s.whatsapp) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM supplier_contacts sc
    WHERE sc.user_id = s.user_id AND sc.supplier_id = s.id
  );

ALTER TABLE suppliers ALTER COLUMN whatsapp DROP NOT NULL;
