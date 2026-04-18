-- Migration: Prompt template library + execution log
-- Run in Supabase SQL Editor

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,                    -- e.g. "pdp.writer", "seo.meta"
  version int not null default 1,
  title text,
  description text,
  template text not null,                -- {{var}} style placeholders
  system_prompt text,                    -- optional separate system prompt
  model text not null default 'anthropic/claude-sonnet-4.5',
  tier text not null default 'balanced', -- fast/balanced/complex/reasoning
  max_tokens int default 3000,
  temperature numeric default 0.7,
  tags text[] default '{}',
  is_active boolean default false,
  is_champion boolean default false,     -- marked as best-performing in its slug
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(slug, version)
);

create index if not exists prompts_slug_idx on prompts(slug);
create index if not exists prompts_active_idx on prompts(slug, is_active) where is_active = true;

create table if not exists prompt_runs (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references prompts(id) on delete set null,
  prompt_slug text,                      -- denormalized for fast filter
  prompt_version int,
  input jsonb,
  output jsonb,
  rendered_user_prompt text,
  model_used text,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  cost_usd numeric,
  score numeric,                         -- 0-100, filled by judge or QA
  success boolean default true,
  error_message text,
  source text,                           -- which skill/pipeline called it
  tags text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists prompt_runs_slug_idx on prompt_runs(prompt_slug, created_at desc);
create index if not exists prompt_runs_prompt_idx on prompt_runs(prompt_id, created_at desc);
create index if not exists prompt_runs_score_idx on prompt_runs(prompt_slug, score desc) where score is not null;
