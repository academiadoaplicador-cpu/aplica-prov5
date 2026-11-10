-- Perfil do fornecedor: login próprio, ligado a um cadastro de fornecedor.
-- O admin cria o acesso; o fornecedor edita contatos direto e pede aprovação
-- para razão social, CNPJ e marcas/linhas atendidas.

-- Papel 'supplier' (recria a checagem só se ainda não aceitar o papel novo).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND pg_get_constraintdef(oid) LIKE '%supplier%'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('applicator', 'client', 'supplier'));
  END IF;
END $$;

-- Uma conta de login por cadastro de fornecedor (e vice-versa).
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS account_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_account_user
  ON suppliers (account_user_id) WHERE account_user_id IS NOT NULL;

-- Alterações que só valem depois da aprovação do admin.
CREATE TABLE IF NOT EXISTS supplier_change_requests (
  id TEXT PRIMARY KEY,
  catalog_user_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  -- { legalName?, cnpj?, productLinks?: [{ brand, line }] } — só o que mudou.
  changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (catalog_user_id, supplier_id)
    REFERENCES suppliers(user_id, id) ON DELETE CASCADE
);

-- No máximo uma solicitação pendente por fornecedor (uma nova substitui a anterior).
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_change_pending
  ON supplier_change_requests (catalog_user_id, supplier_id)
  WHERE status = 'pending';
