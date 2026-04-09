-- Auto Operations Engine
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS auto_ops_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_type TEXT NOT NULL CHECK (run_type IN ('hourly', 'daily', 'manual')),
  trigger_source TEXT NOT NULL DEFAULT 'cron' CHECK (trigger_source IN ('cron', 'manual', 'webhook')),
  tasks_executed JSONB DEFAULT '[]',
  results_summary JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_ops_logs_type ON auto_ops_logs(run_type);
CREATE INDEX IF NOT EXISTS idx_auto_ops_logs_created ON auto_ops_logs(created_at DESC);

ALTER TABLE auto_ops_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_ops_logs_all" ON auto_ops_logs FOR ALL USING (true);
