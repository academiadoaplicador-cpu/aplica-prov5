-- Marketplace Fase 1: pedido do cliente, match por cidade e aceite pelo aplicador.

-- Tabela de preço de referência da plataforma (linha única, mantida pelo admin).
-- Existe porque o cliente pede orçamento antes de ter um aplicador, então não há
-- financial_settings de ninguém para usar como base.
CREATE TABLE IF NOT EXISTS platform_pricing (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 50,
  profit_margin_percentage NUMERIC(5, 2) NOT NULL DEFAULT 30,
  tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 6,
  range_below_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15,
  range_above_percentage NUMERIC(5, 2) NOT NULL DEFAULT 25,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_pricing_singleton CHECK (id = 'default')
);

INSERT INTO platform_pricing (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Disponibilidade do aplicador: offline sai do rodízio de pedidos novos.
ALTER TABLE applicator_profiles
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE applicator_profiles
  ADD COLUMN IF NOT EXISTS availability_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Aguardando aceite',

  -- o que o cliente pediu
  type TEXT NOT NULL,
  sub_type TEXT,
  scope_label TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  vehicle_id TEXT,
  part_ids TEXT[] NOT NULL DEFAULT '{}',
  items JSONB NOT NULL DEFAULT '[]',
  material_type TEXT NOT NULL,

  -- estimativa congelada no momento do pedido
  estimated_m2 NUMERIC(10, 4) NOT NULL,
  estimated_hours NUMERIC(10, 2) NOT NULL,
  reference_price_per_m2 NUMERIC(10, 2) NOT NULL,
  suggested_price NUMERIC(12, 2) NOT NULL,
  price_min NUMERIC(12, 2) NOT NULL,
  price_max NUMERIC(12, 2) NOT NULL,

  -- região do match
  city TEXT NOT NULL,
  state_code TEXT NOT NULL,
  cep TEXT NOT NULL DEFAULT '',

  accepted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  budget_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT service_requests_status_check
    CHECK (status IN ('Aguardando aceite', 'Aceito', 'Expirado', 'Cancelado'))
);

-- Mural do aplicador: pedidos abertos de uma cidade, os mais novos primeiro.
CREATE INDEX IF NOT EXISTS idx_service_requests_open_region
  ON service_requests (state_code, city, created_at DESC)
  WHERE status = 'Aguardando aceite';

CREATE INDEX IF NOT EXISTS idx_service_requests_client
  ON service_requests (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_accepted_by
  ON service_requests (accepted_by, accepted_at DESC);

-- Varredura de expiração (roda sob demanda, sem agendador).
CREATE INDEX IF NOT EXISTS idx_service_requests_expiry
  ON service_requests (expires_at)
  WHERE status = 'Aguardando aceite';
