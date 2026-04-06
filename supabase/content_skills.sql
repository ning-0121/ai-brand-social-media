-- Content Skills System
-- Run in Supabase SQL Editor

-- ============================================
-- 1. Content Skills Registry
-- ============================================
CREATE TABLE IF NOT EXISTS content_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('website', 'social', 'campaign', 'ugc')),
  description TEXT,
  inputs JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  estimated_cost JSONB DEFAULT '{}',
  estimated_time_seconds INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_skills_category ON content_skills(category);
CREATE INDEX IF NOT EXISTS idx_content_skills_active ON content_skills(is_active);

-- ============================================
-- 2. Radar Signals
-- ============================================
CREATE TABLE IF NOT EXISTS radar_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('competitor', 'trend', 'viral')),
  title TEXT NOT NULL,
  source TEXT,
  signal JSONB NOT NULL DEFAULT '{}',
  relevant_product_ids UUID[] DEFAULT '{}',
  suggested_skill_id TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'used', 'expired', 'dismissed')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radar_signals_type ON radar_signals(type);
CREATE INDEX IF NOT EXISTS idx_radar_signals_status ON radar_signals(status);
CREATE INDEX IF NOT EXISTS idx_radar_signals_priority ON radar_signals(priority);

-- ============================================
-- 3. Content Tasks (cross-module)
-- ============================================
CREATE TABLE IF NOT EXISTS content_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id TEXT NOT NULL,
  product_id UUID,
  product_name TEXT,
  source_module TEXT,
  source_ref JSONB,
  inputs JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'approved', 'failed')),
  result JSONB,
  approval_task_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_tasks_skill ON content_tasks(skill_id);
CREATE INDEX IF NOT EXISTS idx_content_tasks_status ON content_tasks(status);
CREATE INDEX IF NOT EXISTS idx_content_tasks_source ON content_tasks(source_module);
CREATE INDEX IF NOT EXISTS idx_content_tasks_product ON content_tasks(product_id);

-- ============================================
-- 4. RLS Policies
-- ============================================
ALTER TABLE content_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_skills_all" ON content_skills FOR ALL USING (true);
CREATE POLICY "radar_signals_all" ON radar_signals FOR ALL USING (true);
CREATE POLICY "content_tasks_all" ON content_tasks FOR ALL USING (true);

-- ============================================
-- 5. Seed Skills
-- ============================================
INSERT INTO content_skills (id, name, category, description, estimated_cost, estimated_time_seconds, icon, color) VALUES
-- Website skills
('product_detail_page', '商品详情页制作', 'website', '为商品生成完整的详情页（标题、副标题、卖点、规格、CTA、SEO meta）', '{"text": 0.02, "image": 0}', 30, 'FileText', 'blue'),
('product_seo_optimize', 'SEO 标题描述优化', 'website', '针对商品生成优化后的 meta title、description、tags 和 body_html', '{"text": 0.01, "image": 0}', 20, 'Search', 'green'),
('homepage_design', '首页装修与文案', 'website', '为店铺首页生成完整文案：banner、Hero 区、推荐区、活动区', '{"text": 0.03, "image": 0.04}', 60, 'Home', 'purple'),
('campaign_landing', '活动落地页与方案', 'website', '为营销活动生成完整落地页和推广方案', '{"text": 0.04, "image": 0.04}', 90, 'Megaphone', 'red'),
('internal_site_optimize', '网站内部优化', 'website', '分析并优化网站导航、分类、搜索、关联推荐策略', '{"text": 0.02, "image": 0}', 30, 'Network', 'cyan'),
('promotion_strategy', '卖家活动分析与建议', 'website', '基于销售数据生成下次活动建议（折扣、商品组合、节奏）', '{"text": 0.02, "image": 0}', 30, 'TrendingUp', 'amber'),

-- Social skills
('social_post_pack', '社媒爆款帖子包', 'social', '生成 3 条不同角度的帖子（种草、场景、证言）+ 配图 prompt + hashtag', '{"text": 0.02, "image": 0.12}', 60, 'Sparkles', 'pink'),
('short_video_script', '短视频脚本', 'social', '生成 15s/30s/60s 短视频分镜脚本、BGM 建议、标签', '{"text": 0.02, "image": 0}', 30, 'Video', 'indigo'),
('content_calendar', '30 天内容日历', 'social', '基于商品库、季节、节日生成 30 天内容主题表', '{"text": 0.05, "image": 0}', 45, 'Calendar', 'teal'),
('hashtag_strategy', 'Hashtag 策略', 'social', '生成核心 + 长尾 + 趋势三层 hashtag 策略', '{"text": 0.01, "image": 0}', 15, 'Hash', 'violet'),
('influencer_brief', '达人合作 Brief', 'social', '为达人合作生成拍摄要求、文案建议、卖点和视频结构', '{"text": 0.02, "image": 0}', 30, 'Users', 'orange'),
('ugc_response', 'UGC 回应模板', 'social', '为用户评论/帖子生成回复、合作邀请和二次传播策略', '{"text": 0.01, "image": 0}', 15, 'MessageSquare', 'rose')

ON CONFLICT (id) DO NOTHING;
