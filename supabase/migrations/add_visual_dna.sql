-- Visual DNA：品牌视觉基因 — 所有图片生成的共同锚点
alter table brand_guides
  add column if not exists visual_dna text,
  add column if not exists moodboard_urls jsonb default '[]',
  add column if not exists visual_dna_generated_at timestamptz;

-- Campaign variants：A/B 测试两版活动
create table if not exists campaign_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  spec jsonb not null,                   -- 原始活动配置
  variant_a jsonb not null,              -- 生成结果 A
  variant_b jsonb,                       -- 生成结果 B
  deployed_a_url text,
  deployed_b_url text,
  views_a int default 0,
  views_b int default 0,
  conversions_a int default 0,
  conversions_b int default 0,
  winner text,                           -- 'a' | 'b' | null
  winner_declared_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists cv_winner_idx on campaign_variants(winner, created_at desc);

-- Campaign calendar：营销日历条目
create table if not exists campaign_calendar (
  id uuid primary key default gen_random_uuid(),
  scheduled_date date not null,
  campaign_name text not null,
  status text not null default 'planned', -- planned | composing | ready | deployed | skipped
  spec jsonb,                             -- 生成时用的 config
  notes text,
  holiday_tag text,                       -- '母亲节' '双11' 等
  variant_id uuid references campaign_variants(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists cc_date_idx on campaign_calendar(scheduled_date);
create index if not exists cc_status_idx on campaign_calendar(status, scheduled_date);
