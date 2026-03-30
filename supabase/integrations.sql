-- Platform Integrations table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'tiktok_shop', 'amazon', 'etsy', 'walmart', 'faire', 'instagram', 'xiaohongshu')),
  store_name TEXT NOT NULL,
  store_url TEXT,
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can only see their own integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Also allow anon access for now (before auth is fully enforced)
CREATE POLICY "Allow anon read integrations" ON integrations
  FOR SELECT USING (true);
CREATE POLICY "Allow anon write integrations" ON integrations
  FOR ALL USING (true);
