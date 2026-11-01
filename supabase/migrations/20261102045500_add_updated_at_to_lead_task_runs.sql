alter table public.lead_task_runs
  add column if not exists updated_at timestamptz not null default now();
