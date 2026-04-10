-- ============================================================
-- Security Fix: Replace all permissive RLS policies with
-- authenticated-user-only policies.
--
-- IMPORTANT: Run this AFTER verifying all tables have a user_id
-- column or can be scoped to authenticated users.
--
-- For tables without user_id, we use auth.uid() IS NOT NULL
-- (requires login, but doesn't scope by user — suitable for
-- single-tenant / single-user deployments).
--
-- For tables with user_id, we use auth.uid() = user_id
-- (proper multi-tenant row isolation).
-- ============================================================

-- Helper: require authenticated user (single-tenant safe default)
-- For multi-tenant, replace with: auth.uid() = user_id

-- ========== schema.sql tables ==========

DROP POLICY IF EXISTS "Allow public read" ON hot_products;
DROP POLICY IF EXISTS "Allow public write" ON hot_products;
CREATE POLICY "Authenticated read hot_products" ON hot_products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write hot_products" ON hot_products FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON competitors;
DROP POLICY IF EXISTS "Allow public write" ON competitors;
CREATE POLICY "Authenticated read competitors" ON competitors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write competitors" ON competitors FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON contents;
DROP POLICY IF EXISTS "Allow public write" ON contents;
CREATE POLICY "Authenticated read contents" ON contents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write contents" ON contents FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON content_templates;
DROP POLICY IF EXISTS "Allow public write" ON content_templates;
CREATE POLICY "Authenticated read content_templates" ON content_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write content_templates" ON content_templates FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON products;
DROP POLICY IF EXISTS "Allow public write" ON products;
CREATE POLICY "Authenticated read products" ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write products" ON products FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON social_accounts;
DROP POLICY IF EXISTS "Allow public write" ON social_accounts;
CREATE POLICY "Authenticated read social_accounts" ON social_accounts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write social_accounts" ON social_accounts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON scheduled_posts;
DROP POLICY IF EXISTS "Allow public write" ON scheduled_posts;
CREATE POLICY "Authenticated read scheduled_posts" ON scheduled_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write scheduled_posts" ON scheduled_posts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON skill_packs;
DROP POLICY IF EXISTS "Allow public write" ON skill_packs;
CREATE POLICY "Authenticated read skill_packs" ON skill_packs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write skill_packs" ON skill_packs FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== integrations.sql — CRITICAL: contains API keys ==========

DROP POLICY IF EXISTS "Allow anon read integrations" ON integrations;
DROP POLICY IF EXISTS "Allow anon write integrations" ON integrations;
CREATE POLICY "Authenticated read integrations" ON integrations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write integrations" ON integrations FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== agent_workflow.sql ==========

DROP POLICY IF EXISTS "Allow public read agent_roles" ON agent_roles;
DROP POLICY IF EXISTS "Allow public write agent_roles" ON agent_roles;
CREATE POLICY "Authenticated read agent_roles" ON agent_roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write agent_roles" ON agent_roles FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read workflow_templates" ON workflow_templates;
DROP POLICY IF EXISTS "Allow public write workflow_templates" ON workflow_templates;
CREATE POLICY "Authenticated read workflow_templates" ON workflow_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write workflow_templates" ON workflow_templates FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read workflow_instances" ON workflow_instances;
DROP POLICY IF EXISTS "Allow public write workflow_instances" ON workflow_instances;
CREATE POLICY "Authenticated read workflow_instances" ON workflow_instances FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write workflow_instances" ON workflow_instances FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read workflow_tasks" ON workflow_tasks;
DROP POLICY IF EXISTS "Allow public write workflow_tasks" ON workflow_tasks;
CREATE POLICY "Authenticated read workflow_tasks" ON workflow_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write workflow_tasks" ON workflow_tasks FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read agent_outputs" ON agent_outputs;
DROP POLICY IF EXISTS "Allow public write agent_outputs" ON agent_outputs;
CREATE POLICY "Authenticated read agent_outputs" ON agent_outputs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write agent_outputs" ON agent_outputs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read uploaded_assets" ON uploaded_assets;
DROP POLICY IF EXISTS "Allow public write uploaded_assets" ON uploaded_assets;
CREATE POLICY "Authenticated read uploaded_assets" ON uploaded_assets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write uploaded_assets" ON uploaded_assets FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== approval_workflow.sql ==========

DROP POLICY IF EXISTS "Allow public read approval_tasks" ON approval_tasks;
DROP POLICY IF EXISTS "Allow public write approval_tasks" ON approval_tasks;
CREATE POLICY "Authenticated read approval_tasks" ON approval_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write approval_tasks" ON approval_tasks FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== shopify_data.sql — remove anon bypass ==========

DROP POLICY IF EXISTS "Allow anon read shopify_orders" ON shopify_orders;
DROP POLICY IF EXISTS "Allow anon write shopify_orders" ON shopify_orders;
DROP POLICY IF EXISTS "Allow anon read shopify_customers" ON shopify_customers;
DROP POLICY IF EXISTS "Allow anon write shopify_customers" ON shopify_customers;
DROP POLICY IF EXISTS "Allow anon read shopify_order_items" ON shopify_order_items;
DROP POLICY IF EXISTS "Allow anon write shopify_order_items" ON shopify_order_items;
-- The proper user_id-scoped policies from shopify_data.sql remain active

-- ========== oem_b2b.sql — PII data ==========

DROP POLICY IF EXISTS "buyers_all" ON buyers;
DROP POLICY IF EXISTS "inquiries_all" ON inquiries;
DROP POLICY IF EXISTS "wa_conv_all" ON whatsapp_conversations;
DROP POLICY IF EXISTS "wa_msg_all" ON whatsapp_messages;
DROP POLICY IF EXISTS "quotations_all" ON quotations;
CREATE POLICY "Authenticated read buyers" ON buyers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write buyers" ON buyers FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read inquiries" ON inquiries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write inquiries" ON inquiries FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read whatsapp_conversations" ON whatsapp_conversations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write whatsapp_conversations" ON whatsapp_conversations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read whatsapp_messages" ON whatsapp_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write whatsapp_messages" ON whatsapp_messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read quotations" ON quotations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write quotations" ON quotations FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== d2c_operations.sql ==========

DROP POLICY IF EXISTS "seo_keywords_all" ON seo_keywords;
DROP POLICY IF EXISTS "ad_campaigns_all" ON ad_campaigns;
DROP POLICY IF EXISTS "ad_creatives_all" ON ad_creatives;
DROP POLICY IF EXISTS "campaigns_all" ON campaigns;
CREATE POLICY "Authenticated read seo_keywords" ON seo_keywords FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write seo_keywords" ON seo_keywords FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read ad_campaigns" ON ad_campaigns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write ad_campaigns" ON ad_campaigns FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read ad_creatives" ON ad_creatives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write ad_creatives" ON ad_creatives FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read campaigns" ON campaigns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write campaigns" ON campaigns FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== content_skills.sql ==========

DROP POLICY IF EXISTS "content_skills_all" ON content_skills;
DROP POLICY IF EXISTS "radar_signals_all" ON radar_signals;
DROP POLICY IF EXISTS "content_tasks_all" ON content_tasks;
CREATE POLICY "Authenticated read content_skills" ON content_skills FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write content_skills" ON content_skills FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read radar_signals" ON radar_signals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write radar_signals" ON radar_signals FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read content_tasks" ON content_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write content_tasks" ON content_tasks FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== diagnostic.sql ==========

DROP POLICY IF EXISTS "diagnostic_reports_all" ON diagnostic_reports;
DROP POLICY IF EXISTS "diagnostic_findings_all" ON diagnostic_findings;
CREATE POLICY "Authenticated read diagnostic_reports" ON diagnostic_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write diagnostic_reports" ON diagnostic_reports FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read diagnostic_findings" ON diagnostic_findings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write diagnostic_findings" ON diagnostic_findings FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== creative_studio.sql ==========

DROP POLICY IF EXISTS "creative_projects_all" ON creative_projects;
CREATE POLICY "Authenticated read creative_projects" ON creative_projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write creative_projects" ON creative_projects FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== media_library.sql ==========

DROP POLICY IF EXISTS "media_library_all" ON media_library;
CREATE POLICY "Authenticated read media_library" ON media_library FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write media_library" ON media_library FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== auto_ops.sql ==========

DROP POLICY IF EXISTS "auto_ops_logs_all" ON auto_ops_logs;
CREATE POLICY "Authenticated read auto_ops_logs" ON auto_ops_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write auto_ops_logs" ON auto_ops_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== ops_director.sql ==========

DROP POLICY IF EXISTS "ops_goals_all" ON ops_goals;
DROP POLICY IF EXISTS "ops_weekly_plans_all" ON ops_weekly_plans;
DROP POLICY IF EXISTS "ops_daily_tasks_all" ON ops_daily_tasks;
DROP POLICY IF EXISTS "ops_snapshots_all" ON ops_performance_snapshots;
CREATE POLICY "Authenticated read ops_goals" ON ops_goals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write ops_goals" ON ops_goals FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read ops_weekly_plans" ON ops_weekly_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write ops_weekly_plans" ON ops_weekly_plans FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read ops_daily_tasks" ON ops_daily_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write ops_daily_tasks" ON ops_daily_tasks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read ops_performance_snapshots" ON ops_performance_snapshots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write ops_performance_snapshots" ON ops_performance_snapshots FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== sprint_v1.sql ==========

DROP POLICY IF EXISTS "content_queue_all" ON content_queue;
DROP POLICY IF EXISTS "creative_exports_all" ON creative_exports;
DROP POLICY IF EXISTS "approval_logs_all" ON approval_logs;
CREATE POLICY "Authenticated read content_queue" ON content_queue FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write content_queue" ON content_queue FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read creative_exports" ON creative_exports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write creative_exports" ON creative_exports FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read approval_logs" ON approval_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write approval_logs" ON approval_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== agent_v2.sql ==========

DROP POLICY IF EXISTS "agent_tasks_v2_all" ON agent_tasks_v2;
CREATE POLICY "Authenticated read agent_tasks_v2" ON agent_tasks_v2 FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write agent_tasks_v2" ON agent_tasks_v2 FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== influencers.sql ==========

DROP POLICY IF EXISTS "Allow public read influencers" ON influencers;
DROP POLICY IF EXISTS "Allow public write influencers" ON influencers;
CREATE POLICY "Authenticated read influencers" ON influencers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write influencers" ON influencers FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== content_media.sql ==========

DROP POLICY IF EXISTS "Allow public read content_media" ON content_media;
DROP POLICY IF EXISTS "Allow public write content_media" ON content_media;
CREATE POLICY "Authenticated read content_media" ON content_media FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write content_media" ON content_media FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== live_qa.sql ==========

DROP POLICY IF EXISTS "live_sessions_all" ON live_sessions;
CREATE POLICY "Authenticated read live_sessions" ON live_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write live_sessions" ON live_sessions FOR ALL USING (auth.uid() IS NOT NULL);

-- ========== customer_service.sql ==========
-- Check if table exists before dropping policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tickets') THEN
    EXECUTE 'DROP POLICY IF EXISTS "customer_tickets_all" ON customer_tickets';
    EXECUTE 'CREATE POLICY "Authenticated read customer_tickets" ON customer_tickets FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "Authenticated write customer_tickets" ON customer_tickets FOR ALL USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;
