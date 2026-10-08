-- Tipo de cotação: 'completo' (aplicador fornece o material) ou 'mao_de_obra'
-- (cliente fornece o material escolhido no catálogo; só a aplicação é cobrada).
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS supply_mode TEXT NOT NULL DEFAULT 'completo';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS client_material_id TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS client_material_product TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS client_material_color TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_requests_supply_mode_check'
  ) THEN
    ALTER TABLE service_requests
      ADD CONSTRAINT service_requests_supply_mode_check
      CHECK (supply_mode IN ('completo', 'mao_de_obra'));
  END IF;
END $$;
