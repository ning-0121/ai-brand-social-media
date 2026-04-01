-- Approval Workflow System
-- Run in Supabase SQL Editor

-- ============================================
-- 1. Extend Products table with Shopify fields
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_product_id BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_variant_id BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT;

CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);

-- ============================================
-- 2. Approval Tasks table (审批任务)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN (
    'seo_update', 'product_edit', 'price_update', 'inventory_update',
    'content_publish', 'social_post'
  )),
  entity_id UUID,
  entity_type TEXT CHECK (entity_type IN ('products', 'contents', 'scheduled_posts')),
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')) DEFAULT 'pending',
  created_by TEXT NOT NULL CHECK (created_by IN ('ai', 'user')) DEFAULT 'ai',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  execution_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_tasks_status ON approval_tasks(status);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_type ON approval_tasks(type);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_entity ON approval_tasks(entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_created ON approval_tasks(created_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_approval_tasks_updated_at ON approval_tasks;
CREATE TRIGGER update_approval_tasks_updated_at
  BEFORE UPDATE ON approval_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE approval_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read approval_tasks" ON approval_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public write approval_tasks" ON approval_tasks FOR ALL USING (true);
