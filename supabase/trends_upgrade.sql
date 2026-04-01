-- Trends System Upgrade
-- Run in Supabase SQL Editor

-- Fix competitors table - add missing fields used by UI
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS avg_engagement NUMERIC(5,2) DEFAULT 0;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS growth_rate NUMERIC(6,2) DEFAULT 0;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS trend TEXT CHECK (trend IN ('up', 'down', 'flat')) DEFAULT 'flat';
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS top_category TEXT;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS recent_campaigns INTEGER DEFAULT 0;
