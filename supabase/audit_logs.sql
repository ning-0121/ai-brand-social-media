-- ============================================================
-- Audit Logs & Rate Limit Counters
-- Commercial Readiness Sprint 1
-- ============================================================

-- Unified audit log for all external execution actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who performed the action
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system', 'cron')),
  actor_id TEXT,
  source_agent TEXT,

  -- What action was performed
  action_type TEXT NOT NULL,

  -- What was acted upon
  target_type TEXT,
  target_id TEXT,

  -- Payloads
  request_payload JSONB DEFAULT '{}',
  response_payload JSONB DEFAULT '{}',

  -- Outcome
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rolled_back', 'partial')),
  error TEXT,

  -- Rollback tracking
  rollback_status TEXT CHECK (rollback_status IN (NULL, 'pending', 'completed', 'failed')),
  rollback_ref UUID,

  -- Gateway metadata
  idempotency_key TEXT,
  provider TEXT,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_idempotency ON audit_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status) WHERE status != 'success';

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read audit_logs" ON audit_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write audit_logs" ON audit_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- Allow service-role / anon inserts from cron and agents (they don't have user session)
-- The anon key can insert but only authenticated users can read
CREATE POLICY "Allow anon insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- ============================================================
-- Rate Limit Counters (for Supabase-backed rate limiting)
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup ON rate_limit_counters(window_start);

ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limit_counters_all" ON rate_limit_counters FOR ALL USING (true);
