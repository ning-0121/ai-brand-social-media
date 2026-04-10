-- Agent V2 System
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS agent_tasks_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'approved', 'rejected', 'failed', 'qa_rejected')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  input JSONB DEFAULT '{}',
  output JSONB,
  source_module TEXT,
  target_module TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approval_id UUID,
  execution_result JSONB,
  qa_score DECIMAL(5,1),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_v2_agent ON agent_tasks_v2(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_v2_status ON agent_tasks_v2(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_v2_priority ON agent_tasks_v2(priority);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_v2_source ON agent_tasks_v2(source_module);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_v2_created ON agent_tasks_v2(created_at DESC);

ALTER TABLE agent_tasks_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_tasks_v2_all" ON agent_tasks_v2 FOR ALL USING (true);
