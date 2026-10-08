-- Orçamento com vários itens (ex.: dois veículos, duas geladeiras). Cada item guarda
-- o próprio cálculo e material; as colunas de total do orçamento ficam com a soma.
-- Lista vazia = orçamento antigo de um item só, descrito pelas colunas da tabela.
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]';
