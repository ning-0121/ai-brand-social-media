-- Sprint V1: Real Execution Pipeline
-- Run in Supabase SQL Editor

-- 1. Extend creative_projects project_type
ALTER TABLE creative_projects DROP CONSTRAINT IF EXISTS creative_projects_project_type_check;
ALTER TABLE creative_projects ADD CONSTRAINT creative_projects_project_type_check
  CHECK (project_type IN ('page', 'design', 'video', 'campaign', 'image_edit'));

-- 2. Content Queue (审批通过后的发布队列)
CREATE TABLE IF NOT EXISTS content_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('tiktok_script', 'instagram_caption', 'pinterest_title', 'email_copy', 'blog_seo', 'ad_copy')),
  title TEXT NOT NULL,
  body TEXT,
  platform TEXT,
  product_id UUID,
  product_name TEXT,
  agent_task_id UUID,
  approval_id UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_queue_all" ON content_queue FOR ALL USING (true);

-- 3. Creative Exports (审批通过后的素材包)
CREATE TABLE IF NOT EXISTS creative_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES creative_projects(id) ON DELETE SET NULL,
  export_type TEXT NOT NULL DEFAULT 'asset_pack',
  assets JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'downloaded')),
  download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creative_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creative_exports_all" ON creative_exports FOR ALL USING (true);

-- 4. Approval Logs (审批决策记录)
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_task_id UUID,
  agent_task_id UUID,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'modified', 'rolled_back')),
  decision_by TEXT DEFAULT 'user',
  reason TEXT,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_logs_task ON approval_logs(approval_task_id);
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_logs_all" ON approval_logs FOR ALL USING (true);
