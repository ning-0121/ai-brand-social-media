-- ============================================================
-- Pilot Center: Internal Proof of Value Framework
-- ============================================================

CREATE TABLE IF NOT EXISTS pilot_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','completed','archived')),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pilot_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES pilot_runs(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('owner','operator','designer')),
  module_name TEXT NOT NULL,
  task_title TEXT NOT NULL,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','blocked','skipped')),
  blocker TEXT,
  time_spent_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pilot_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES pilot_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  module_name TEXT NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  most_useful TEXT,
  least_useful TEXT,
  time_saved_minutes INTEGER,
  would_continue BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pilot_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES pilot_runs(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('P0','P1','P2','P3')),
  module_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reproduction_steps TEXT,
  screenshot_url TEXT,
  affects_revenue BOOLEAN DEFAULT false,
  affects_execution BOOLEAN DEFAULT false,
  suggested_fix TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','fixing','resolved','wontfix')),
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pilot_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES pilot_runs(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(12,2),
  baseline_value NUMERIC(12,2),
  improvement_pct NUMERIC(5,2),
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pilot_tasks_run ON pilot_tasks(run_id, day_number);
CREATE INDEX IF NOT EXISTS idx_pilot_issues_run ON pilot_issues(run_id, severity);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_run ON pilot_feedback(run_id);
CREATE INDEX IF NOT EXISTS idx_pilot_metrics_run ON pilot_metrics(run_id);

-- RLS
ALTER TABLE pilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_pilot_runs" ON pilot_runs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_pilot_tasks" ON pilot_tasks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_pilot_feedback" ON pilot_feedback FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_pilot_issues" ON pilot_issues FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_pilot_metrics" ON pilot_metrics FOR ALL USING (auth.uid() IS NOT NULL);
