-- ============================================================
-- 客户画像系统 — 碎片化 + AI 推理基础表
-- ============================================================

-- 1. 扩展 brand_guides 表 — 增加经营理念/偏好/约束字段
alter table brand_guides
  add column if not exists operating_philosophy jsonb,
  add column if not exists operational_preferences jsonb,
  add column if not exists business_constraints jsonb,
  add column if not exists growth_targets jsonb,
  add column if not exists past_wins jsonb,
  add column if not exists past_failures jsonb,
  add column if not exists profile_completion_pct smallint default 0,
  add column if not exists profile_last_updated timestamptz;

-- operating_philosophy 示例 (JSON):
-- {
--   "growth_stance": "aggressive" | "sustainable" | "profitability_first",
--   "discount_appetite": "never" | "occasional" | "frequent",
--   "risk_tolerance": "conservative" | "moderate" | "bold",
--   "time_horizon": "short_term_cash" | "brand_building" | "long_term_moat"
-- }

-- operational_preferences 示例:
-- {
--   "kol_collab": "open" | "selective" | "never",
--   "paid_ads": "primary_channel" | "supplementary" | "avoid",
--   "content_style": "ugc_authentic" | "polished_brand" | "mixed",
--   "sale_channels": ["own_shopify", "amazon", "tiktok_shop"],
--   "automation_comfort": "full_auto" | "approval_gated" | "human_led"
-- }

-- 2. AI 推理信号表 — 存储从各种输入中推理出的信号
create table if not exists client_inferences (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null,
  -- 来源: voice_note | image_upload | shopify_sync | text_input | competitor_url
  source text not null,
  source_ref text,
  -- 推理维度: brand_positioning | tone_style | audience_inference | pricing_tier
  --          | growth_stance | visual_aesthetic | product_category
  dimension text not null,
  inferred_value jsonb not null,
  confidence numeric(3,2) default 0.7,
  -- 客户是否已确认
  confirmed boolean default false,
  rejected boolean default false,
  user_override jsonb,
  created_at timestamptz default now(),
  confirmed_at timestamptz
);
create index if not exists idx_client_inferences_dimension on client_inferences(dimension);
create index if not exists idx_client_inferences_confirmed on client_inferences(confirmed);

-- 3. 渐进式 onboarding 任务表
create table if not exists onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  task_key text unique not null,
  display_order smallint not null,
  title text not null,
  description text not null,
  task_type text not null,
  -- voice_note | text_input | image_upload | shopify_sync | competitor_url | multi_select | single_select
  estimated_seconds smallint default 30,
  -- 完成此任务解锁哪个功能
  unlocks_feature text,
  -- JSON 描述的输入结构（选项/占位符）
  input_schema jsonb,
  status text default 'pending',
  -- pending | completed | skipped
  completed_at timestamptz,
  input_data jsonb,
  inference_ids uuid[],
  created_at timestamptz default now()
);
create index if not exists idx_onboarding_tasks_status on onboarding_tasks(status);
create index if not exists idx_onboarding_tasks_order on onboarding_tasks(display_order);

-- 4. 竞品表（为模块 2 预留，本轮不深做）
create table if not exists competitor_products (
  id uuid primary key default gen_random_uuid(),
  competitor_brand text not null,
  product_name text,
  product_url text,
  price_usd numeric(10,2),
  image_urls text[],
  -- 详细对比评分（25+ 维度，用 JSON 存）
  teardown_scores jsonb,
  -- 总分（0-100）
  total_score smallint,
  our_product_id uuid,
  notes text,
  purchased boolean default false,
  received boolean default false,
  teardown_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_competitor_products_brand on competitor_products(competitor_brand);

-- 5. 预置 5 个渐进式任务
insert into onboarding_tasks (task_key, display_order, title, description, task_type, estimated_seconds, unlocks_feature, input_schema) values
  ('bring_product_photo', 1, '传一张最满意的产品照',
   '就你卖得最好、或者最能代表品牌的那张。AI 会从图里推出你的视觉调性、价格带、目标人群。',
   'image_upload', 30, 'visual_dna_analysis',
   '{"accept": "image/*", "max_size_mb": 10, "prompt": "拖拽或点击上传"}'::jsonb),
  ('describe_customer_30s', 2, '用 30 秒说一下你的客户是什么样的人',
   '语音或文字都行。谁买你的东西？她们是因为什么选择你？AI 从你的语气里就能推出品牌调性。',
   'voice_note', 30, 'audience_persona',
   '{"accept": "audio/*", "max_duration_s": 60, "fallback_text": true}'::jsonb),
  ('pick_operating_stance', 3, '你是哪种操盘手？',
   '三选一，30 秒决定。选完后所有 AI 决策都会围绕你的风格。',
   'single_select', 20, 'weekly_plan_alignment',
   '{"options": [
      {"value": "aggressive", "label": "激进派", "desc": "快速增长 > 利润率，愿意打折冲量、愿意花预算测试"},
      {"value": "sustainable", "label": "稳健派", "desc": "增长和利润平衡，选择性打折，理性投入"},
      {"value": "profitability_first", "label": "利润派", "desc": "先赚钱再增长，绝少打折，每分预算都要 ROAS 达标"}
    ]}'::jsonb),
  ('list_2_competitors', 4, '列 2 个你最在意的竞品',
   '品牌名或直接贴链接。AI 会把他们纳入你的竞品库，后面做深度对比。',
   'text_input', 30, 'competitive_intel',
   '{"placeholder": "如：Alo Yoga, Vuori（逗号分隔）或竞品商品 URL", "min_count": 1, "max_count": 5}'::jsonb),
  ('what_you_wont_do', 5, '明确说一下：什么事你绝对不做？',
   '比如「绝不打五折以下」「绝不找网红假种草」「绝不在亚马逊卖」。这是所有 AI 决策的红线。',
   'text_input', 30, 'decision_red_lines',
   '{"placeholder": "每条一行，越具体越好", "multiline": true, "max_length": 1000}'::jsonb)
on conflict (task_key) do nothing;

-- RLS 开放（简化）
alter table client_inferences enable row level security;
alter table onboarding_tasks enable row level security;
alter table competitor_products enable row level security;

drop policy if exists "client_inferences_rw" on client_inferences;
create policy "client_inferences_rw" on client_inferences for all using (true) with check (true);
drop policy if exists "onboarding_tasks_rw" on onboarding_tasks;
create policy "onboarding_tasks_rw" on onboarding_tasks for all using (true) with check (true);
drop policy if exists "competitor_products_rw" on competitor_products;
create policy "competitor_products_rw" on competitor_products for all using (true) with check (true);
