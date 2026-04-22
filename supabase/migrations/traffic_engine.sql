-- ============================================================
-- 流量编排系统 — ROI 驱动的多渠道控制
-- ============================================================

-- 1. 流量渠道表 — 每个渠道的实时财务与业绩
create table if not exists traffic_channels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  -- slug: programmatic_seo | topical_authority | schema_markup | google_shopping
  --       haro_pr | reddit_quora | meta_ads | tiktok_ads | email | influencer | affiliate
  name text not null,
  category text not null,
  -- category: seo | paid | owned | pr | community | partnership
  status text default 'not_started',
  -- status: not_started | warming_up | active | paused | killed
  monthly_budget_usd numeric(10,2) default 0,
  monthly_spent_usd numeric(10,2) default 0,
  month_to_date_traffic integer default 0,
  month_to_date_conversions integer default 0,
  month_to_date_revenue_usd numeric(10,2) default 0,
  roas numeric(6,2),
  -- cost per: acquisition / lead / click
  cpa_usd numeric(10,2),
  cpc_usd numeric(10,4),
  -- 时间 to ROI（天）
  time_to_roi_days smallint,
  -- 渠道天花板估计（月最大营收）
  scaling_ceiling_monthly_usd numeric(10,2),
  -- AI 杠杆（0-10：AI 能把这个渠道自动化多少）
  ai_leverage_score smallint default 5,
  last_updated date default current_date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_traffic_channels_status on traffic_channels(status);
create index if not exists idx_traffic_channels_category on traffic_channels(category);

-- 2. SEO 关键词追踪
create table if not exists seo_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  -- intent: informational | commercial | transactional | brand
  intent text not null default 'commercial',
  -- cluster: 属于哪个 content_cluster
  cluster_id uuid,
  target_url text,
  current_rank smallint,
  previous_rank smallint,
  search_volume_monthly integer,
  difficulty_score smallint,  -- 0-100 from Ahrefs/Semrush style
  -- 对应我方哪个 product / category
  related_product_id uuid,
  priority text default 'medium', -- high | medium | low
  tracked_since date default current_date,
  last_checked date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_seo_keywords_cluster on seo_keywords(cluster_id);
create index if not exists idx_seo_keywords_rank on seo_keywords(current_rank);

-- 3. 内容集群 / 主题权威架构
create table if not exists content_clusters (
  id uuid primary key default gen_random_uuid(),
  cluster_name text not null,
  -- pillar_page: 集群核心页
  pillar_keyword text not null,
  pillar_url text,
  pillar_published boolean default false,
  cluster_page_count integer default 0,
  -- internal_linking_done: 是否完成内部链接
  internal_linking_done boolean default false,
  status text default 'planning',
  -- status: planning | writing | published | optimizing
  estimated_traffic_monthly integer,
  actual_traffic_last_30d integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. HARO / 记者询问 + pitch
create table if not exists haro_pitches (
  id uuid primary key default gen_random_uuid(),
  source text default 'haro', -- haro | qwoted | featured | muckrack
  journalist_query text not null,
  publication text,
  deadline timestamptz,
  -- 我们的角度
  our_angle text,
  pitch_draft text,
  pitch_sent_at timestamptz,
  -- 结果
  response_received boolean default false,
  published boolean default false,
  published_url text,
  dofollow_link boolean default false,
  domain_authority smallint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_haro_pitches_deadline on haro_pitches(deadline);
create index if not exists idx_haro_pitches_published on haro_pitches(published);

-- 5. 影响者/联盟合作追踪
create table if not exists influencer_partners (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  platform text not null, -- tiktok | instagram | youtube
  tier text default 'micro', -- nano <5k | micro 5-100k | mid 100-500k | macro 500k+
  follower_count integer,
  avg_engagement_rate numeric(5,2),
  -- 合作条款
  compensation_model text, -- flat_fee | commission | hybrid | gifted
  flat_fee_usd numeric(10,2),
  commission_pct numeric(5,2),
  -- 追踪
  unique_code text,
  tracking_link text,
  -- 累计表现
  total_clicks integer default 0,
  total_conversions integer default 0,
  total_revenue_usd numeric(10,2) default 0,
  total_paid_usd numeric(10,2) default 0,
  effective_roas numeric(6,2),
  status text default 'outreach', -- outreach | negotiating | active | paused | ended
  last_post_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_influencer_platform on influencer_partners(platform);
create index if not exists idx_influencer_status on influencer_partners(status);

-- 6. 预置 8 个流量渠道（初始化状态）
insert into traffic_channels (slug, name, category, status, time_to_roi_days, scaling_ceiling_monthly_usd, ai_leverage_score, notes) values
  ('programmatic_seo', '长尾程序化 SEO', 'seo', 'not_started', 60, 15000, 9,
   '成本 $200/月（工具）；花 8-12 周起效。AI 最大杠杆：关键词挖掘 + 批量生成页面 + 内链自动化'),
  ('topical_authority', '主题权威架构', 'seo', 'not_started', 45, 20000, 7,
   '成本极低（内容时间）；4-8 周起效。AI 杠杆：支柱页/集群页规划 + 内链推荐'),
  ('schema_markup', 'Schema 结构化数据', 'seo', 'not_started', 14, 5000, 10,
   '一次性，免费。2-4 周 SERP 富结果。提升 CTR 20-40%'),
  ('google_shopping', 'Google Shopping + Pmax', 'paid', 'not_started', 21, 30000, 8,
   '预算 $300-800/月；2-3 周学习期。女装 DTC 主力转化渠道'),
  ('meta_ads', 'Meta 广告（Facebook+IG）', 'paid', 'not_started', 14, 50000, 7,
   'ABO 测试 → CBO 放量。女装 CPM $15-30，CPA $20-45'),
  ('tiktok_ads', 'TikTok Spark Ads', 'paid', 'not_started', 21, 40000, 7,
   'Spark Ads vs 标准 In-Feed：CVR +69%，CPA -37%'),
  ('haro_pr', 'HARO / 媒体 PR', 'pr', 'not_started', 60, 3000, 6,
   'HARO.com / Featured.com 免费。5-15% 中标率。主要建 E-E-A-T'),
  ('reddit_quora', '社区问答', 'community', 'not_started', 45, 5000, 5,
   'r/FashionPlus / r/SustainableFashion。0 成本，需真专家回答。CAC $5-20'),
  ('email_sms', '邮件/SMS 自营流量', 'owned', 'not_started', 14, 100000, 8,
   'RFM 分段 + winback 可占总营收 25-35%'),
  ('influencer_affiliate', 'KOL / 联盟', 'partnership', 'not_started', 21, 25000, 6,
   '微影响者 5k-100k 粉，平均 ROI 4x。最好用 Refersion/ReferralCandy 追踪')
on conflict (slug) do nothing;

-- RLS
alter table traffic_channels enable row level security;
alter table seo_keywords enable row level security;
alter table content_clusters enable row level security;
alter table haro_pitches enable row level security;
alter table influencer_partners enable row level security;

drop policy if exists "traffic_channels_rw" on traffic_channels;
create policy "traffic_channels_rw" on traffic_channels for all using (true) with check (true);
drop policy if exists "seo_keywords_rw" on seo_keywords;
create policy "seo_keywords_rw" on seo_keywords for all using (true) with check (true);
drop policy if exists "content_clusters_rw" on content_clusters;
create policy "content_clusters_rw" on content_clusters for all using (true) with check (true);
drop policy if exists "haro_pitches_rw" on haro_pitches;
create policy "haro_pitches_rw" on haro_pitches for all using (true) with check (true);
drop policy if exists "influencer_partners_rw" on influencer_partners;
create policy "influencer_partners_rw" on influencer_partners for all using (true) with check (true);
