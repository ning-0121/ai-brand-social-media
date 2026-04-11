-- ============================================================
-- Tech Debt: Missing Indexes for Common Query Patterns
-- ============================================================

DO $$
BEGIN
  -- approval_tasks: filtered by status + sorted by created_at
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approval_tasks') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_tasks_status_created ON approval_tasks(status, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_tasks_type ON approval_tasks(type)';
  END IF;

  -- workflow_tasks: filtered by workflow_id + status
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workflow_tasks') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow_status ON workflow_tasks(workflow_id, status)';
  END IF;

  -- whatsapp_conversations: filtered by status + unread
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_conversations') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_wa_conv_status_unread ON whatsapp_conversations(status, unread_count) WHERE unread_count > 0';
  END IF;

  -- whatsapp_messages: sorted by conversation + time
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_messages') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_wa_msg_conv_created ON whatsapp_messages(conversation_id, created_at DESC)';
  END IF;

  -- products: filtered by status, sorted by seo_score
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_seo ON products(seo_score) WHERE seo_score > 0';
  END IF;

  -- contents: filtered by status
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contents') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status)';
  END IF;

  -- agent_tasks_v2: filtered by status + agent_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agent_tasks_v2') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_agent_tasks_v2_status ON agent_tasks_v2(status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_agent_tasks_v2_agent ON agent_tasks_v2(agent_id)';
  END IF;

  -- creative_projects: filtered by project_type + status
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='creative_projects') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_creative_projects_type_status ON creative_projects(project_type, status)';
  END IF;

  -- content_tasks: filtered by status
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='content_tasks') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_content_tasks_status ON content_tasks(status)';
  END IF;

  -- ad_campaigns: filtered by status
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ad_campaigns') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status)';
  END IF;
END $$;
