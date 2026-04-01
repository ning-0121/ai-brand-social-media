-- Influencers Management System
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'xiaohongshu', 'amazon', 'shopify', 'independent')),
  handle TEXT,
  avatar_url TEXT,
  followers INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  category TEXT DEFAULT '未分类',
  bio TEXT,
  profile_url TEXT,
  price_min NUMERIC(10,2) DEFAULT 0,
  price_max NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'inactive', 'blacklist')) DEFAULT 'pending',
  ai_score INTEGER DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_analysis JSONB DEFAULT '{}',
  collaboration_count INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  avg_roi NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  last_collaboration_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influencers_platform ON influencers(platform);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(status);
CREATE INDEX IF NOT EXISTS idx_influencers_category ON influencers(category);
CREATE INDEX IF NOT EXISTS idx_influencers_ai_score ON influencers(ai_score DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_influencers_updated_at ON influencers;
CREATE TRIGGER update_influencers_updated_at
  BEFORE UPDATE ON influencers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read influencers" ON influencers FOR SELECT USING (true);
CREATE POLICY "Allow public write influencers" ON influencers FOR ALL USING (true);
