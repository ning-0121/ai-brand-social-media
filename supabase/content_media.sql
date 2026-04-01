-- Content Media System
-- Run in Supabase SQL Editor

-- ============================================
-- 1. Extend Contents table with media fields
-- ============================================
ALTER TABLE contents ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE contents ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- ============================================
-- 2. Content Media table (素材存储)
-- ============================================
CREATE TABLE IF NOT EXISTS content_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  url TEXT NOT NULL,
  prompt TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_media_content ON content_media(content_id);
CREATE INDEX IF NOT EXISTS idx_content_media_type ON content_media(media_type);

-- RLS
ALTER TABLE content_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read content_media" ON content_media FOR SELECT USING (true);
CREATE POLICY "Allow public write content_media" ON content_media FOR ALL USING (true);

-- ============================================
-- 3. Supabase Storage bucket (手动在 Dashboard 创建)
-- ============================================
-- Bucket name: content-media
-- Public: true
-- Max file size: 10MB
-- Allowed MIME types: image/png, image/jpeg, image/webp
