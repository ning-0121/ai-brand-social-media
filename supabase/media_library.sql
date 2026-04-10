-- Media Library + AI Image Editing
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document')),
  mime_type TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  product_id UUID,
  product_name TEXT,
  source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'ai_generated', 'ai_edited', 'shopify_sync')),
  parent_id UUID,              -- 原图 ID（AI 修图后另存为新记录，保留原图引用）
  ai_edit_prompt TEXT,         -- AI 修图时的 prompt
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_library_category ON media_library(category);
CREATE INDEX IF NOT EXISTS idx_media_library_product ON media_library(product_id);
CREATE INDEX IF NOT EXISTS idx_media_library_source ON media_library(source);
CREATE INDEX IF NOT EXISTS idx_media_library_parent ON media_library(parent_id);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_library_all" ON media_library FOR ALL USING (true);
