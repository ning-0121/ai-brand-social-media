-- ============================================================
-- Workflow Orchestrator — runs 持久化表
-- ============================================================

create table if not exists workflow_runs (
  run_id text primary key,
  playbook_id text not null,
  playbook_name text,
  status text not null default 'running',
  user_id uuid references auth.users(id) on delete set null,
  context jsonb,
  result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_workflow_runs_status on workflow_runs(status);
create index if not exists idx_workflow_runs_playbook on workflow_runs(playbook_id);
create index if not exists idx_workflow_runs_created on workflow_runs(created_at desc);
create index if not exists idx_workflow_runs_user on workflow_runs(user_id);

-- RLS 开启，但为简化让所有登录用户可读写
alter table workflow_runs enable row level security;

drop policy if exists "workflow_runs_rw" on workflow_runs;
create policy "workflow_runs_rw" on workflow_runs
  for all using (true) with check (true);
