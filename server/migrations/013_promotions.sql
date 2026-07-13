CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cta_label TEXT,
  cta_url TEXT,
  banner_desktop_url TEXT NOT NULL,
  banner_mobile_url TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_window
  ON promotions (is_active, starts_at, ends_at);
