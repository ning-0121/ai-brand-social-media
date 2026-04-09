-- D2C Operations System
-- Run in Supabase SQL Editor

-- ============================================
-- 1. SEO Keywords Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  target_position INTEGER,
  current_position INTEGER,
  search_volume INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  product_id UUID,
  url TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON seo_keywords(keyword);

-- ============================================
-- 2. Ad Campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'instagram', 'tiktok', 'pinterest')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended', 'archived')),
  campaign_type TEXT DEFAULT 'conversion' CHECK (campaign_type IN ('awareness', 'traffic', 'conversion', 'retargeting')),
  budget DECIMAL(12,2),
  budget_type TEXT DEFAULT 'daily' CHECK (budget_type IN ('daily', 'lifetime')),
  target_audience JSONB DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  cpa DECIMAL(12,2) DEFAULT 0,
  roas DECIMAL(5,2) DEFAULT 0,
  ai_recommendations JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON ad_campaigns(platform);

-- ============================================
-- 3. Ad Creatives
-- ============================================
CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  creative_type TEXT DEFAULT 'image' CHECK (creative_type IN ('image', 'video', 'carousel', 'text')),
  headline TEXT,
  body TEXT,
  image_url TEXT,
  cta TEXT,
  platform_format TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'rejected')),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  performance_score DECIMAL(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign ON ad_creatives(campaign_id);

-- ============================================
-- 4. Campaigns (Marketing Events)
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('black_friday', 'new_launch', 'seasonal', 'clearance', 'holiday', 'flash_sale', 'custom')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'preparing', 'active', 'ended', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  discount_strategy TEXT,
  target_revenue DECIMAL(12,2),
  products JSONB DEFAULT '[]',
  channels JSONB DEFAULT '[]',
  ai_plan JSONB,
  tasks JSONB DEFAULT '[]',
  actual_results JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- ============================================
-- 5. RLS
-- ============================================
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_keywords_all" ON seo_keywords FOR ALL USING (true);
CREATE POLICY "ad_campaigns_all" ON ad_campaigns FOR ALL USING (true);
CREATE POLICY "ad_creatives_all" ON ad_creatives FOR ALL USING (true);
CREATE POLICY "campaigns_all" ON campaigns FOR ALL USING (true);
