-- SEO Upgrade: add handle column to products
-- The handle is the Shopify product URL slug, critical for SEO optimization.

ALTER TABLE products ADD COLUMN IF NOT EXISTS handle TEXT;
