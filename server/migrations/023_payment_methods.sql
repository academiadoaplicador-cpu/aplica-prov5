-- Condições de pagamento: formas aceitas (pix, debito, credito, boleto),
-- parcelamento no crédito e observações negociadas.
-- Na configuração: o padrão que os novos orçamentos trazem preenchido.
-- No orçamento: as condições daquele orçamento, editadas uma a uma, que não
-- mudam se a configuração mudar depois. NULL = a definir na aprovação.
ALTER TABLE financial_settings
  ADD COLUMN IF NOT EXISTS payment_terms JSONB;

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS payment_terms JSONB;
