-- AI Agent Workflow System
-- Run in Supabase SQL Editor

-- ============================================
-- 1. Agent Roles (AI 角色定义)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('operations', 'social', 'product', 'content')),
  description TEXT,
  system_prompt TEXT,
  capabilities JSONB DEFAULT '[]',
  data_access JSONB DEFAULT '[]',
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Workflow Templates (工作流模板)
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('launch', 'daily_ops', 'campaign', 'research', 'optimization')),
  steps JSONB NOT NULL DEFAULT '[]',
  estimated_duration TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Workflow Instances (运行中的工作流)
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'failed', 'cancelled')) DEFAULT 'active',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  input_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_user ON workflow_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

-- ============================================
-- 4. Workflow Tasks (工作流任务)
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES workflow_tasks(id) ON DELETE SET NULL,
  step_index INTEGER NOT NULL,
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'queued', 'running', 'awaiting_approval',
    'completed', 'failed', 'skipped', 'cancelled'
  )) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  input_data JSONB DEFAULT '{}',
  output_data JSONB,
  error_message TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approval_task_id UUID,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  parallel_group TEXT,
  depends_on JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow ON workflow_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_agent ON workflow_tasks(agent_name);

-- ============================================
-- 5. Agent Outputs (Agent 产出存档)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES workflow_tasks(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  output_type TEXT NOT NULL,
  title TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_task ON agent_outputs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent ON agent_outputs(agent_name);

-- ============================================
-- 6. Uploaded Assets (用户上传素材)
-- ============================================
CREATE TABLE IF NOT EXISTS uploaded_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'spreadsheet', 'other')),
  category TEXT CHECK (category IN ('product_photo', 'brand_guideline', 'logo', 'reference', 'raw_material', 'other')) DEFAULT 'other',
  url TEXT NOT NULL,
  storage_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  workflow_id UUID REFERENCES workflow_instances(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_assets_user ON uploaded_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_assets_workflow ON uploaded_assets(workflow_id);

-- ============================================
-- 7. Extend approval_tasks for workflow integration
-- ============================================
ALTER TABLE approval_tasks ADD COLUMN IF NOT EXISTS workflow_task_id UUID;
ALTER TABLE approval_tasks ADD COLUMN IF NOT EXISTS agent_name TEXT;

-- ============================================
-- Triggers
-- ============================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'agent_roles', 'workflow_templates', 'workflow_instances', 'workflow_tasks'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================
-- RLS (permissive for now, matching existing pattern)
-- ============================================
ALTER TABLE agent_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read agent_roles" ON agent_roles FOR SELECT USING (true);
CREATE POLICY "Allow public write agent_roles" ON agent_roles FOR ALL USING (true);
CREATE POLICY "Allow public read workflow_templates" ON workflow_templates FOR SELECT USING (true);
CREATE POLICY "Allow public write workflow_templates" ON workflow_templates FOR ALL USING (true);
CREATE POLICY "Allow public read workflow_instances" ON workflow_instances FOR SELECT USING (true);
CREATE POLICY "Allow public write workflow_instances" ON workflow_instances FOR ALL USING (true);
CREATE POLICY "Allow public read workflow_tasks" ON workflow_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public write workflow_tasks" ON workflow_tasks FOR ALL USING (true);
CREATE POLICY "Allow public read agent_outputs" ON agent_outputs FOR SELECT USING (true);
CREATE POLICY "Allow public write agent_outputs" ON agent_outputs FOR ALL USING (true);
CREATE POLICY "Allow public read uploaded_assets" ON uploaded_assets FOR SELECT USING (true);
CREATE POLICY "Allow public write uploaded_assets" ON uploaded_assets FOR ALL USING (true);

-- ============================================
-- Seed: 7 Agent Roles
-- ============================================
INSERT INTO agent_roles (name, display_name, department, description, capabilities, icon, color) VALUES
('store_optimizer', '店铺优化专员', 'operations', 'SEO 审计、商品文案优化、详情页优化、关键词分析', '["seo_optimize","seo_apply"]', 'Store', '#10b981'),
('data_analyst', '数据分析专员', 'operations', '销售数据分析、运营洞察、每日巡检、异常预警', '["ai_daily_insight","live_review","skill_recommendation"]', 'BarChart3', '#6366f1'),
('ad_manager', '广告投放专员', 'operations', '广告策划、创意文案、投放优化、预算分配', '["ad_copy","ad_optimization"]', 'Megaphone', '#f59e0b'),
('social_strategist', '社媒策略专员', 'social', '社媒排期策划、渠道评估、KOL 合作管理', '["social_scheduling","channel_evaluation","influencer_analysis","influencer_outreach","influencer_strategy"]', 'Share2', '#ec4899'),
('brand_strategist', '品牌策略专员', 'product', '品牌定位分析、用户画像、品牌调性指南', '["brand_analysis","persona_generation","brand_tone"]', 'Target', '#8b5cf6'),
('market_researcher', '市场调研专员', 'product', '趋势搜索、竞品分析、市场洞察、选品建议', '["trend_search","competitor_search","trend_analysis","competitor_analysis"]', 'Radar', '#0ea5e9'),
('content_producer', '内容制作专员', 'content', '接收各部门 brief，产出文案、图片、创意素材', '["content","content_package","live_script"]', 'Palette', '#f97316')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Seed: Workflow Template - 新品上架
-- ============================================
INSERT INTO workflow_templates (name, display_name, description, category, estimated_duration, icon, steps) VALUES
('new_product_launch', '新品上架', '从竞品调研到内容推广的完整新品上架流程', 'launch', '约 10 分钟', 'Rocket', '[
  {"index":0,"agent_name":"market_researcher","task_type":"competitor_research","title":"竞品调研","description":"分析该品类的市场竞争格局和热门产品","requires_approval":false,"depends_on":[]},
  {"index":1,"agent_name":"brand_strategist","task_type":"positioning","title":"产品定位分析","description":"基于竞品数据确定产品定位和差异化策略","requires_approval":false,"depends_on":[0],"parallel_group":"analysis"},
  {"index":2,"agent_name":"store_optimizer","task_type":"seo_audit","title":"SEO 审计","description":"分析当前商品页面的 SEO 状况","requires_approval":false,"depends_on":[0],"parallel_group":"analysis"},
  {"index":3,"agent_name":"store_optimizer","task_type":"seo_apply","title":"生成优化文案","description":"AI 生成优化后的标题、描述、Meta 标签","requires_approval":true,"depends_on":[1,2]},
  {"index":4,"agent_name":"content_producer","task_type":"product_content","title":"产品内容包","description":"生成产品主图文案、详情页内容、社媒配图","requires_approval":true,"depends_on":[3]},
  {"index":5,"agent_name":"social_strategist","task_type":"social_plan","title":"社媒推广计划","description":"制定各平台发布排期和内容策略","requires_approval":false,"depends_on":[4],"parallel_group":"promo"},
  {"index":6,"agent_name":"ad_manager","task_type":"ad_campaign","title":"广告投放方案","description":"生成广告文案、受众定位、预算分配建议","requires_approval":false,"depends_on":[4],"parallel_group":"promo"},
  {"index":7,"agent_name":"content_producer","task_type":"promo_creatives","title":"推广创意制作","description":"制作社媒帖子和广告创意素材","requires_approval":true,"depends_on":[5,6]}
]'::jsonb),
('daily_operations', '每日运营巡检', '每天自动分析店铺状况，发现问题，给出行动建议', 'daily_ops', '约 3 分钟', 'ClipboardCheck', '[
  {"index":0,"agent_name":"data_analyst","task_type":"daily_insight","title":"每日运营洞察","description":"分析昨日销售、订单、流量数据","requires_approval":false,"depends_on":[]},
  {"index":1,"agent_name":"store_optimizer","task_type":"store_health","title":"店铺健康检查","description":"检查商品状态、库存、SEO 分数","requires_approval":false,"depends_on":[0]},
  {"index":2,"agent_name":"social_strategist","task_type":"schedule_review","title":"今日发布计划","description":"检查今日排期内容和优化建议","requires_approval":false,"depends_on":[0]}
]'::jsonb),
('seo_optimization', '全店 SEO 优化', '批量审计所有商品 SEO，AI 生成优化方案', 'optimization', '约 8 分钟', 'Search', '[
  {"index":0,"agent_name":"store_optimizer","task_type":"full_seo_audit","title":"全店 SEO 审计","description":"审计所有商品的标题、描述、Meta 标签","requires_approval":false,"depends_on":[]},
  {"index":1,"agent_name":"store_optimizer","task_type":"batch_seo_apply","title":"批量优化方案","description":"AI 为低分商品生成优化文案","requires_approval":true,"depends_on":[0]},
  {"index":2,"agent_name":"content_producer","task_type":"seo_content","title":"SEO 内容优化","description":"生成优化后的产品描述和 Meta 标签","requires_approval":true,"depends_on":[1]}
]'::jsonb)
ON CONFLICT (name) DO NOTHING;
