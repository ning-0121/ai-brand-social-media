-- ============================================================
-- 全链转化优化系统 — CVR 从 2% 到 3.5% 的 10 个杠杆
-- ============================================================

-- 1. 评价请求表 — 谁/何时/带图/是否转化
create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  customer_email text,
  product_id uuid,
  shopify_product_id bigint,
  sent_channel text, -- sms | email | push
  sent_at timestamptz,
  delivery_date date,
  -- 评价结果
  reviewed boolean default false,
  reviewed_at timestamptz,
  rating smallint,
  has_photo boolean default false,
  review_text text,
  -- 追踪是否因评价邀请而转化
  incentive_offered text, -- discount_code | free_gift | none
  review_source text default 'internal', -- loox | judgeme | okendo | internal
  created_at timestamptz default now()
);
create index if not exists idx_review_requests_reviewed on review_requests(reviewed);
create index if not exists idx_review_requests_product on review_requests(product_id);

-- 2. 信任信号审计表 — 记录店铺每个触点的信任信号覆盖情况
create table if not exists trust_signals (
  id uuid primary key default gen_random_uuid(),
  page_type text not null,
  -- page_type: product_page | cart | checkout | landing | homepage | email
  signal_type text not null,
  -- signal_type: guarantee | free_returns | ssl_badge | reviews_inline
  --            | stock_urgency | shipping_info | payment_icons | live_chat
  is_present boolean default false,
  quality_score smallint, -- 0-5，质量（文字清晰度、位置、视觉权重）
  last_audited date,
  recommended_position text,
  impact_estimate text, -- 如 "+10-17% CVR"
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_trust_signals_page on trust_signals(page_type);

-- 3. 产品质量问题追踪 — 退货/投诉数据汇总到 SKU
create table if not exists product_quality_issues (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  shopify_product_id bigint,
  issue_type text not null,
  -- issue_type: sizing | defect | color_mismatch | fabric | shipping_damage | wrong_item
  severity text default 'medium', -- low | medium | high | critical
  reported_count integer default 1,
  first_reported_date date default current_date,
  last_reported_date date default current_date,
  -- 根本原因
  root_cause text,
  -- 是否已联系供应商 / 已整改
  supplier_contacted boolean default false,
  supplier_contacted_date date,
  resolved boolean default false,
  resolved_date date,
  resolution_notes text,
  customer_examples text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_quality_issues_product on product_quality_issues(product_id);
create index if not exists idx_quality_issues_severity on product_quality_issues(severity);
create index if not exists idx_quality_issues_resolved on product_quality_issues(resolved);

-- 4. CVR 实验追踪
create table if not exists cvr_experiments (
  id uuid primary key default gen_random_uuid(),
  hypothesis text not null,
  experiment_area text not null,
  -- product_page | checkout | cart | email | landing_page
  change_description text not null,
  -- 预测
  predicted_cvr_lift_pct numeric(5,2),
  effort text default 'medium', -- low | medium | high
  -- 状态
  status text default 'planned',
  -- planned | running | completed | rolled_back
  started_at date,
  ended_at date,
  -- 结果
  baseline_cvr_pct numeric(5,2),
  variant_cvr_pct numeric(5,2),
  actual_lift_pct numeric(5,2),
  statistical_significance boolean,
  learnings text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_cvr_experiments_status on cvr_experiments(status);

-- 5. 客服会话（购前回复）与转化追踪
create table if not exists support_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_identifier text, -- email 或 anonymous_id
  channel text not null,
  -- channel: live_chat | whatsapp | instagram_dm | email | sms
  first_message_at timestamptz not null,
  first_response_at timestamptz,
  response_time_seconds integer,
  message_count integer default 1,
  topic text, -- sizing | shipping | return_policy | product_info | complaint
  resolved boolean default false,
  resolved_at timestamptz,
  -- 是否因此转化（关键指标）
  led_to_purchase boolean default false,
  order_id text,
  order_value_usd numeric(10,2),
  csat_score smallint, -- 1-5
  ai_assisted boolean default false,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_support_sessions_channel on support_sessions(channel);
create index if not exists idx_support_sessions_purchase on support_sessions(led_to_purchase);

-- 6. 忠诚度会员
create table if not exists loyalty_members (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  shopify_customer_id bigint,
  tier text default 'new',
  -- tier: new | bronze | silver | gold | platinum
  total_orders integer default 0,
  total_spend_usd numeric(10,2) default 0,
  total_referrals integer default 0,
  -- 触发点
  signup_date date default current_date,
  last_purchase_date date,
  days_since_last_purchase integer,
  -- 权益
  points_balance integer default 0,
  referral_code text,
  -- 是否进入召回 / VIP 流程
  in_winback_sequence boolean default false,
  unique(customer_email)
);
create index if not exists idx_loyalty_members_tier on loyalty_members(tier);
create index if not exists idx_loyalty_members_days_since on loyalty_members(days_since_last_purchase);

-- 7. 预置信任信号审计清单
insert into trust_signals (page_type, signal_type, is_present, impact_estimate, recommended_position, notes) values
  ('product_page', 'reviews_inline', false, '+18% CVR', '价格旁', '3+ 条带图评价 + 星评摘要'),
  ('product_page', 'stock_urgency', false, '+10-15% 加购率', '库存 < 20 时显示', '"仅剩 X 件" 或 "X 人正在查看"'),
  ('product_page', 'shipping_info', false, '+5% CVR', 'Add to Cart 按钮下方', '免运费门槛 + 送达时间'),
  ('cart', 'free_returns', false, '+12% checkout 率', '购物车总金额旁', '"30 天免费退货"'),
  ('cart', 'payment_icons', false, '+3% CVR', '结账按钮下方', 'Apple Pay / Klarna / Afterpay 图标'),
  ('checkout', 'guarantee', false, '+10-17% CVR', '结账按钮下方', '"30 天满意保证" 文字 + 图标'),
  ('checkout', 'ssl_badge', false, '+5% trust', '信用卡输入框旁', '"256-bit SSL 加密" 文字比图标更有效'),
  ('checkout', 'shipping_info', false, '+22% 完成率', '页面顶部', '预期送达日期 + 免运资格'),
  ('homepage', 'reviews_aggregate', false, '+8% 商品页跳转', '首屏 hero 下方', '"基于 X 条评价，4.9 星"'),
  ('email', 'guarantee', false, '+15% 邮件点击', '产品推荐下方', '"免运 + 30 天退换"')
on conflict do nothing;

-- RLS
alter table review_requests enable row level security;
alter table trust_signals enable row level security;
alter table product_quality_issues enable row level security;
alter table cvr_experiments enable row level security;
alter table support_sessions enable row level security;
alter table loyalty_members enable row level security;

drop policy if exists "review_requests_rw" on review_requests;
create policy "review_requests_rw" on review_requests for all using (true) with check (true);
drop policy if exists "trust_signals_rw" on trust_signals;
create policy "trust_signals_rw" on trust_signals for all using (true) with check (true);
drop policy if exists "product_quality_issues_rw" on product_quality_issues;
create policy "product_quality_issues_rw" on product_quality_issues for all using (true) with check (true);
drop policy if exists "cvr_experiments_rw" on cvr_experiments;
create policy "cvr_experiments_rw" on cvr_experiments for all using (true) with check (true);
drop policy if exists "support_sessions_rw" on support_sessions;
create policy "support_sessions_rw" on support_sessions for all using (true) with check (true);
drop policy if exists "loyalty_members_rw" on loyalty_members;
create policy "loyalty_members_rw" on loyalty_members for all using (true) with check (true);
