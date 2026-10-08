-- Disputa com prazos: 12 h para um aplicador aceitar; depois do aceite, 1 h para
-- enviar o valor exato. Estourou a 1 h, o pedido volta para os outros e quem não
-- respondeu fica bloqueado só naquele pedido por 12 h.

-- Histórico do pedido: quando foi disponibilizado, aceito, respondido, recusado...
CREATE TABLE IF NOT EXISTS service_request_events (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  applicator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_request_events_request
  ON service_request_events (request_id, created_at);

-- Bloqueio por pedido: o aplicador não vê nem aceita aquele pedido até blocked_until.
CREATE TABLE IF NOT EXISTS service_request_blocks (
  request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  applicator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, applicator_id)
);

CREATE INDEX IF NOT EXISTS idx_service_request_blocks_applicator
  ON service_request_blocks (applicator_id, blocked_until);

-- Por que o pedido voltou ao mural (para avisar o cliente). Limpo no próximo aceite.
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS reopened_reason TEXT;

-- Prazo da primeira resposta, gravado no aceite. Pedidos aceitos antes desta
-- regra ficam sem prazo (NULL) e não são repassados.
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ;

DROP INDEX IF EXISTS idx_service_requests_response_due;
CREATE INDEX IF NOT EXISTS idx_service_requests_response_due_at
  ON service_requests (response_due_at)
  WHERE status = 'Aceito' AND proposal_status IS NULL;
