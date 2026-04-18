-- Migration: prompt_outcomes — 记录 prompt 生成内容部署到店铺后的真实商业效果
-- Run in Supabase SQL Editor

create table if not exists prompt_outcomes (
  id uuid primary key default gen_random_uuid(),
  prompt_run_id uuid references prompt_runs(id) on delete set null,
  prompt_slug text not null,
  prompt_version int,
  -- 绑定什么被部署
  outcome_type text not null,              -- 'seo_fix', 'detail_page', 'homepage_hero', 'social_post'
  target_type text,                        -- 'product', 'page', 'post'
  target_id text,                          -- product_id / page_id / post_id
  target_name text,                        -- 冗余存名字方便查看
  -- 基线（部署前）+ 测量（N 天后）
  baseline jsonb not null default '{}',    -- { seo_score: 65, ga4_sessions_7d: 12, ... }
  measurement jsonb,                       -- 同结构，测量时间点
  -- 打分
  business_score numeric,                  -- 0-100 综合商业分
  delta jsonb,                             -- 具体变化 { seo_score_delta: +15, sessions_delta: +8 }
  -- 调度
  measure_after timestamptz not null,      -- 什么时候该测量
  measured_at timestamptz,                 -- 实际测量时间
  status text not null default 'pending',  -- pending | measured | skipped | failed
  notes text,
  created_at timestamptz default now()
);

create index if not exists po_status_idx on prompt_outcomes(status, measure_after);
create index if not exists po_slug_idx on prompt_outcomes(prompt_slug, created_at desc);
create index if not exists po_run_idx on prompt_outcomes(prompt_run_id);
