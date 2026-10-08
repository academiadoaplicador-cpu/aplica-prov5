-- Proposta do aplicador: material escolhido e valor real, devolvidos ao cliente.
-- Produto, cor e preço ficam copiados aqui para a proposta não mudar se o catálogo mudar.
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_status TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_material_id TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_material_type TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_product TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_color TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_price_per_m2 NUMERIC(10, 2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_price NUMERIC(12, 2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_note TEXT NOT NULL DEFAULT '';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_responded_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_client_reason TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_requests_proposal_status_check'
  ) THEN
    ALTER TABLE service_requests
      ADD CONSTRAINT service_requests_proposal_status_check
      CHECK (proposal_status IS NULL OR proposal_status IN ('Enviada', 'Aceita', 'Recusada'));
  END IF;
END $$;
