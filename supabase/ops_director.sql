-- AI Operations Director System
-- Run in Supabase SQL Editor

-- ============================================
-- 1. Operations Goals
-- ============================================
CREATE TABLE IF NOT EXISTS ops_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module TEXT NOT NULL CHECK (module IN ('social', 'store', 'ads', 'overall')),
  metric TEXT NOT NULL,
  target_value DECIMAL NOT NULL,
  current_value DECIMAL DEFAULT 0,
  baseline_value DECIMAL DEFAULT 0,
  unit TEXT DEFAULT '',
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_goals_module ON ops_goals(module);
CREATE INDEX IF NOT EXISTS idx_ops_goals_status ON ops_goals(status);

-- ============================================
-- 2. Weekly Plans
-- ============================================
CREATE TABLE IF NOT EXISTS ops_weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module TEXT NOT NULL CHECK (module IN ('social', 'store', 'ads', 'overall')),
  week_start DATE NOT NULL,
  strategy JSONB,
  tasks JSONB DEFAULT '[]',
  review JSONB,
  performance_score DECIMAL(5,1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'reviewed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_weekly_plans_module ON ops_weekly_plans(module);
CREATE INDEX IF NOT EXISTS idx_ops_weekly_plans_week ON ops_weekly_plans(week_start DESC);

-- ============================================
-- 3. Daily Tasks
-- ============================================
CREATE TABLE IF NOT EXISTS ops_daily_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES ops_weekly_plans(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  task_date DATE NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  auto_executable BOOLEAN NOT NULL DEFAULT true,
  target_product_id UUID,
  target_product_name TEXT,
  target_platform TEXT,
  skill_id TEXT,
  execution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (execution_status IN ('pending', 'running', 'auto_executed', 'awaiting_approval', 'approved', 'completed', 'failed', 'skipped')),
  execution_result JSONB,
  performance_data JSONB,
  approval_task_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_daily_tasks_date ON ops_daily_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_ops_daily_tasks_status ON ops_daily_tasks(execution_status);
CREATE INDEX IF NOT EXISTS idx_ops_daily_tasks_plan ON ops_daily_tasks(plan_id);

-- ============================================
-- 4. Performance Snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS ops_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL,
  module TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, module)
);

CREATE INDEX IF NOT EXISTS idx_ops_snapshots_date ON ops_performance_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ops_snapshots_module ON ops_performance_snapshots(module);

-- ============================================
-- 5. RLS
-- ============================================
ALTER TABLE ops_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_goals_all" ON ops_goals FOR ALL USING (true);
CREATE POLICY "ops_weekly_plans_all" ON ops_weekly_plans FOR ALL USING (true);
CREATE POLICY "ops_daily_tasks_all" ON ops_daily_tasks FOR ALL USING (true);
CREATE POLICY "ops_snapshots_all" ON ops_performance_snapshots FOR ALL USING (true);
