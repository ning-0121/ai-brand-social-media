-- ============================================================
-- Module 5: Campaign Operations v2
-- 活动策划 + 第三方合作 完整数据体系
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. KOL / Creator 合作记录
create table if not exists kol_partnerships (
  id          uuid primary key default gen_random_uuid(),
  creator_handle  text not null,
  platform        text not null check (platform in ('tiktok','instagram','youtube','pinterest','other')),
  follower_count  integer,
  engagement_rate numeric(5,2),          -- e.g. 3.86
  tier            text check (tier in ('nano','micro','mid','mega','ugc')),
  category        text,                  -- fashion, beauty, lifestyle...
  deal_type       text check (deal_type in ('gifting','affiliate','flat_fee','hybrid')),
  commission_pct  numeric(5,2),
  flat_fee_usd    numeric(10,2),
  campaign_id     uuid references campaigns(id) on delete set null,
  status          text default 'prospecting'
                    check (status in ('prospecting','contacted','negotiating','contracted','active','completed','declined')),
  brief_sent_at   timestamptz,
  content_due_at  timestamptz,
  published_at    timestamptz,
  expected_reach  integer,
  actual_reach    integer,
  attributed_clicks   integer,
  attributed_revenue  numeric(10,2),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. 联盟分销成员
create table if not exists affiliate_members (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text unique not null,
  website_or_handle text,
  tier            text default 'brand_friend'
                    check (tier in ('brand_friend','brand_advocate','brand_elite','vip_ambassador')),
  referral_code   text unique not null,
  commission_pct  numeric(5,2) not null default 12,
  total_sales_usd numeric(12,2) default 0,
  total_commissions_usd numeric(12,2) default 0,
  click_count     integer default 0,
  order_count     integer default 0,
  conversion_rate numeric(5,2),          -- order_count / click_count * 100
  last_sale_at    timestamptz,
  status          text default 'pending'
                    check (status in ('pending','active','paused','terminated')),
  payment_method  text,
  joined_at       timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 3. 品牌联名合作
create table if not exists brand_collaborations (
  id                  uuid primary key default gen_random_uuid(),
  partner_brand_name  text not null,
  partner_contact     text,
  partner_website     text,
  collab_type         text check (collab_type in ('cross_promotion','bundle_package','co_branded_product','event','giveaway','custom')),
  status              text default 'exploring'
                        check (status in ('exploring','pitched','negotiating','contracted','active','completed','cancelled')),
  campaign_id         uuid references campaigns(id) on delete set null,
  start_date          date,
  end_date            date,
  budget_usd          numeric(10,2),
  revenue_share_pct   numeric(5,2),      -- our share of co-branded revenue
  estimated_reach     integer,
  actual_attributed_revenue numeric(10,2),
  contract_signed     boolean default false,
  pitch_sent_at       timestamptz,
  notes               text,
  ai_match_score      integer,           -- 0-100 from brand_collab_matcher
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 4. 渠道扩张评估记录
create table if not exists marketplace_evaluations (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null check (platform in ('amazon','tiktok_shop','walmart','wholesale','etsy','other')),
  evaluation_date date default current_date,
  readiness_score integer check (readiness_score between 0 and 100),
  recommendation  text check (recommendation in ('go_now','wait_6mo','wait_1yr','not_recommended')),
  score_breakdown jsonb,                 -- {product_fit, fulfillment, content, financial, brand_risk}
  action_plan     jsonb,                 -- array of action steps
  monthly_revenue_potential_usd numeric(10,2),
  setup_cost_usd  numeric(10,2),
  status          text default 'evaluating'
                    check (status in ('evaluating','approved','in_progress','launched','paused')),
  launched_at     timestamptz,
  ai_report       text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 5. 增量测试记录
create table if not exists incrementality_tests (
  id                  uuid primary key default gen_random_uuid(),
  channel             text not null,     -- meta_ads, google_ads, email, etc.
  methodology         text not null,     -- geo_holdout, audience_holdout, psa
  test_start_date     date,
  test_end_date       date,
  holdout_pct         numeric(5,2),
  control_group_size  integer,
  test_group_size     integer,
  -- Results
  reported_roas       numeric(6,2),      -- last-click ROAS before test
  actual_iroas        numeric(6,2),      -- true incremental ROAS from test
  lift_pct            numeric(6,2),      -- revenue lift % vs control
  revenue_in_test     numeric(12,2),
  revenue_in_control  numeric(12,2),
  incremental_revenue numeric(12,2),
  spend_during_test   numeric(10,2),
  statistically_significant boolean,
  p_value             numeric(8,6),
  action_taken        text,              -- "increased budget", "paused channel", etc.
  status              text default 'designing'
                        check (status in ('designing','running','completed','cancelled')),
  ai_design_report    text,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 6. 年度营销日历快照（存储 AI 生成的年度规划）
create table if not exists annual_campaign_plans (
  id          uuid primary key default gen_random_uuid(),
  year        integer not null,
  brand_category  text,
  ai_calendar jsonb,                     -- full annual_campaign_calendar output
  budget_split jsonb,                    -- {Q1_pct, Q2_pct, Q3_pct, Q4_pct}
  status      text default 'draft'
                check (status in ('draft','approved','active','archived')),
  approved_by text,
  approved_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(year)
);

-- ── Extend campaigns table with new columns if not already present ──
alter table campaigns
  add column if not exists kol_budget_usd       numeric(10,2),
  add column if not exists affiliate_enabled    boolean default false,
  add column if not exists collab_partner        text,
  add column if not exists marketplace_channel   text,
  add column if not exists incrementality_test_id uuid references incrementality_tests(id) on delete set null,
  add column if not exists ai_calendar_snapshot  jsonb,
  add column if not exists year                  integer;

-- ── Indexes for performance ──
create index if not exists idx_kol_partnerships_campaign on kol_partnerships(campaign_id);
create index if not exists idx_kol_partnerships_status on kol_partnerships(status);
create index if not exists idx_affiliate_members_tier on affiliate_members(tier);
create index if not exists idx_affiliate_members_status on affiliate_members(status);
create index if not exists idx_brand_collaborations_status on brand_collaborations(status);
create index if not exists idx_marketplace_evaluations_platform on marketplace_evaluations(platform);
create index if not exists idx_incrementality_tests_channel on incrementality_tests(channel);
create index if not exists idx_annual_plans_year on annual_campaign_plans(year);

-- ── updated_at triggers ──
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_kol_partnerships_updated_at') then
    create trigger trg_kol_partnerships_updated_at before update on kol_partnerships
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_affiliate_members_updated_at') then
    create trigger trg_affiliate_members_updated_at before update on affiliate_members
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_brand_collaborations_updated_at') then
    create trigger trg_brand_collaborations_updated_at before update on brand_collaborations
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_marketplace_evaluations_updated_at') then
    create trigger trg_marketplace_evaluations_updated_at before update on marketplace_evaluations
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_incrementality_tests_updated_at') then
    create trigger trg_incrementality_tests_updated_at before update on incrementality_tests
      for each row execute function update_updated_at_column();
  end if;
end $$;

-- ── Seed: sample affiliate members ──
insert into affiliate_members (name, email, referral_code, tier, commission_pct, status) values
  ('Sarah Chen', 'sarah@example.com', 'SARAH15', 'brand_friend', 12, 'active'),
  ('Mia Johnson', 'mia@example.com', 'MIA15', 'brand_advocate', 15, 'active'),
  ('Emma Williams', 'emma@example.com', 'EMMA20', 'brand_elite', 18, 'active')
on conflict (email) do nothing;

-- ── Seed: sample marketplace evaluations ──
insert into marketplace_evaluations (platform, readiness_score, recommendation, status) values
  ('tiktok_shop', 78, 'go_now', 'evaluating'),
  ('amazon', 52, 'wait_6mo', 'evaluating'),
  ('wholesale', 61, 'wait_6mo', 'evaluating')
on conflict do nothing;
