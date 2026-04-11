-- ============================================================
-- Phase B: Analytics — Action Impacts + Weekly Reports
-- ============================================================

-- 1. Action Impacts: track before/after metrics for every AI operation
CREATE TABLE IF NOT EXISTS action_impacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_log_id UUID REFERENCES audit_logs(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,

  before_metrics JSONB DEFAULT '{}',
  after_metrics JSONB DEFAULT '{}',

  impact_score NUMERIC(5,2),
  revenue_impact NUMERIC(12,2),

  measured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_impacts_created ON action_impacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_impacts_action ON action_impacts(action_type);
CREATE INDEX IF NOT EXISTS idx_action_impacts_target ON action_impacts(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_action_impacts_unmeasured ON action_impacts(measured_at) WHERE measured_at IS NULL;

ALTER TABLE action_impacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read action_impacts" ON action_impacts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write action_impacts" ON action_impacts FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow anon insert action_impacts" ON action_impacts FOR INSERT WITH CHECK (true);

-- 2. Weekly Reports: AI-generated weekly operational summaries
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL UNIQUE,

  summary TEXT,
  highlights JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',

  metrics JSONB DEFAULT '{}',
  prev_metrics JSONB DEFAULT '{}',

  ai_actions_count INTEGER DEFAULT 0,
  ai_success_rate NUMERIC(5,2),
  top_actions JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week_start DESC);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read weekly_reports" ON weekly_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write weekly_reports" ON weekly_reports FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow anon insert weekly_reports" ON weekly_reports FOR INSERT WITH CHECK (true);

-- 3. Add missing indexes for common queries (from audit findings)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled ON scheduled_posts(scheduled_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_shopify_orders_date ON shopify_orders(order_date DESC);
