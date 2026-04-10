-- Creative Studio System
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS creative_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_type TEXT NOT NULL CHECK (project_type IN ('page', 'design', 'video', 'campaign')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generating', 'review', 'approved', 'published', 'exported')),
  product_id UUID,
  product_name TEXT,
  brief JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  assets JSONB DEFAULT '[]',
  generated_output JSONB,
  seo JSONB,
  shopify_ref TEXT,
  approval_id UUID,
  agent_task_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_projects_type ON creative_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_creative_projects_status ON creative_projects(status);
CREATE INDEX IF NOT EXISTS idx_creative_projects_created ON creative_projects(created_at DESC);

ALTER TABLE creative_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creative_projects_all" ON creative_projects FOR ALL USING (true);
