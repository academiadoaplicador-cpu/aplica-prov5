-- Pedido do cliente com vários itens (ex.: dois veículos, duas geladeiras), cada um
-- com escopo, produto e estimativa próprios; a proposta do aplicador também vem por
-- item. As colunas antigas ficam com o primeiro item e os totais com a soma.
-- Listas vazias = pedido antigo de um item só, descrito pelas colunas da tabela.
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS request_items JSONB NOT NULL DEFAULT '[]';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS proposal_items JSONB NOT NULL DEFAULT '[]';
