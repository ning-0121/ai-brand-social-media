-- Store Audit Upgrade: add compare_at_price for pricing strategy analysis
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2);
