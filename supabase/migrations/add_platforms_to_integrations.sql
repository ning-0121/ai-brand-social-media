-- Migration: Add facebook, tiktok, google_analytics to integrations platform CHECK constraint
-- Run in Supabase SQL Editor

ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_platform_check;

ALTER TABLE integrations ADD CONSTRAINT integrations_platform_check
  CHECK (platform IN (
    'shopify',
    'tiktok_shop',
    'amazon',
    'etsy',
    'walmart',
    'faire',
    'instagram',
    'facebook',
    'tiktok',
    'xiaohongshu',
    'google_analytics'
  ));
