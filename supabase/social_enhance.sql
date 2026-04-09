-- Social Media Enhancement
-- Run in Supabase SQL Editor

ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS content_task_id UUID;
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS error_message TEXT;
