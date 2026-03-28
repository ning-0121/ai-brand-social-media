-- BrandMind AI Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Hot Products (趋势雷达 - 热门商品)
-- ============================================
CREATE TABLE IF NOT EXISTS hot_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  category TEXT NOT NULL,
  image_url TEXT,
  sales_volume INTEGER DEFAULT 0,
  growth_rate NUMERIC(6,2) DEFAULT 0,
  trend TEXT NOT NULL CHECK (trend IN ('up', 'down', 'flat')) DEFAULT 'flat',
  price_range TEXT,
  rating NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Competitors (趋势雷达 - 竞品)
-- ============================================
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  monthly_sales INTEGER DEFAULT 0,
  price_range TEXT,
  rating NUMERIC(3,2),
  new_product_frequency TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Contents (内容工厂)
-- ============================================
CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  content_type TEXT NOT NULL CHECK (content_type IN ('short_video', 'image_post', 'carousel', 'article', 'story', 'live')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'published', 'scheduled', 'rejected')) DEFAULT 'draft',
  thumbnail_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Content Templates (内容模板)
-- ============================================
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  content_type TEXT NOT NULL,
  prompt_template TEXT,
  example_output TEXT,
  usage_count INTEGER DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Products (店铺优化 - 商品)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'out_of_stock', 'pending_review')) DEFAULT 'active',
  seo_score INTEGER DEFAULT 0 CHECK (seo_score >= 0 AND seo_score <= 100),
  image_url TEXT,
  category TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. Social Accounts (社媒 - 账号)
-- ============================================
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  handle TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  followers INTEGER DEFAULT 0,
  connected BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Scheduled Posts (社媒 - 排期发布)
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_preview TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'published', 'failed', 'draft')) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. Skill Packs (技能包)
-- ============================================
CREATE TABLE IF NOT EXISTS skill_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('operations', 'content', 'seo', 'ads', 'service')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  icon TEXT,
  usage_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  steps JSONB DEFAULT '[]',
  prompts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_hot_products_platform ON hot_products(platform);
CREATE INDEX IF NOT EXISTS idx_hot_products_category ON hot_products(category);
CREATE INDEX IF NOT EXISTS idx_contents_platform ON contents(platform);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_skill_packs_category ON skill_packs(category);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hot_products', 'competitors', 'contents', 'content_templates',
    'products', 'social_accounts', 'scheduled_posts', 'skill_packs'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================
-- Row Level Security (Enable but allow all for now)
-- ============================================
ALTER TABLE hot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_packs ENABLE ROW LEVEL SECURITY;

-- Allow public read access for now (no auth yet)
CREATE POLICY "Allow public read" ON hot_products FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON competitors FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON contents FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON content_templates FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON social_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON scheduled_posts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON skill_packs FOR SELECT USING (true);

-- Allow public insert/update/delete for now
CREATE POLICY "Allow public write" ON hot_products FOR ALL USING (true);
CREATE POLICY "Allow public write" ON competitors FOR ALL USING (true);
CREATE POLICY "Allow public write" ON contents FOR ALL USING (true);
CREATE POLICY "Allow public write" ON content_templates FOR ALL USING (true);
CREATE POLICY "Allow public write" ON products FOR ALL USING (true);
CREATE POLICY "Allow public write" ON social_accounts FOR ALL USING (true);
CREATE POLICY "Allow public write" ON scheduled_posts FOR ALL USING (true);
CREATE POLICY "Allow public write" ON skill_packs FOR ALL USING (true);
