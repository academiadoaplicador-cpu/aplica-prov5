-- Aplicador que aceitou um pedido pode recusar o orçamento; o pedido volta ao
-- mural dos outros aplicadores e não aparece mais para quem recusou.
CREATE TABLE IF NOT EXISTS service_request_refusals (
  request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  applicator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget_id TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, applicator_id)
);

CREATE INDEX IF NOT EXISTS idx_service_request_refusals_applicator
  ON service_request_refusals (applicator_id);
