drop index if exists public.lead_task_runs_idempotency_idx;
create unique index lead_task_runs_idempotency_idx on public.lead_task_runs(workspace_id,idempotency_key);