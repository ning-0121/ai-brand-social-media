-- AI 诊断系统
-- Run in Supabase SQL Editor

-- ============================================
-- 1. 诊断报告
-- ============================================
CREATE TABLE IF NOT EXISTS diagnostic_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'dashboard_load')),
  summary JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_user ON diagnostic_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_status ON diagnostic_reports(status);

-- ============================================
-- 2. 诊断发现 (每个问题一行)
-- ============================================
CREATE TABLE IF NOT EXISTS diagnostic_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES diagnostic_reports(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('seo', 'product', 'inventory', 'sales', 'content')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  affected_entities JSONB DEFAULT '[]',
  recommended_action JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  execution_ref JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_report ON diagnostic_findings(report_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_category ON diagnostic_findings(category);
CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_severity ON diagnostic_findings(severity);
CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_status ON diagnostic_findings(status);

-- ============================================
-- 3. RLS Policies
-- ============================================
ALTER TABLE diagnostic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnostic_reports_all" ON diagnostic_reports FOR ALL USING (true);
CREATE POLICY "diagnostic_findings_all" ON diagnostic_findings FOR ALL USING (true);
