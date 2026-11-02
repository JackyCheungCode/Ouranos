create table if not exists public.linkedin_discovery_runs (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 created_by uuid references auth.users(id) on delete set null,
 name text not null,
 status text not null default 'draft' check (status in ('draft','searching','search_completed','enriching','completed','failed','cancelled')),
 criteria jsonb not null default '{}'::jsonb,
 actor_a_run_id text,
 actor_a_dataset_id text,
 actor_a_status text,
 actor_a_offset integer not null default 0 check (actor_a_offset >= 0),
 actor_b_run_id text,
 actor_b_dataset_id text,
 actor_b_status text,
 actor_b_offset integer not null default 0 check (actor_b_offset >= 0),
 discovered_count integer not null default 0 check (discovered_count >= 0),
 selected_count integer not null default 0 check (selected_count >= 0),
 enriched_count integer not null default 0 check (enriched_count >= 0),
 estimated_cost numeric,
 actual_cost numeric,
 cost_currency text not null default 'USD',
 error_message text,
 started_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.linkedin_candidates (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 run_id uuid not null references public.linkedin_discovery_runs(id) on delete cascade,
 profile_url text not null,
 profile_slug text,
 full_name text,
 headline text,
 job_title text,
 company_name text,
 location text,
 country text,
 skills text[] not null default '{}',
 seniority text,
 experience_years numeric,
 source_title text,
 source_snippet text,
 matched_criteria jsonb not null default '{}'::jsonb,
 visible_evidence_score numeric,
 clean_status text not null default 'new' check (clean_status in ('new','keep','discard','duplicate')),
 selected_for_enrichment boolean not null default false,
 contact_email text,
 contact_phone text,
 email_source text,
 phone_source text,
 profile_data jsonb not null default '{}'::jsonb,
 enriched_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(run_id,profile_url)
);
create table if not exists public.linkedin_discovery_logs (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 run_id uuid not null references public.linkedin_discovery_runs(id) on delete cascade,
 level text not null default 'info' check (level in ('info','success','warning','error')),
 stage text not null,
 message text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists linkedin_discovery_runs_workspace_created_idx on public.linkedin_discovery_runs(workspace_id,created_at desc);
create index if not exists linkedin_candidates_run_status_idx on public.linkedin_candidates(run_id,clean_status,created_at desc);
create index if not exists linkedin_candidates_workspace_url_idx on public.linkedin_candidates(workspace_id,profile_url);
create index if not exists linkedin_discovery_logs_run_created_idx on public.linkedin_discovery_logs(run_id,created_at desc);
alter table public.linkedin_discovery_runs enable row level security;
alter table public.linkedin_candidates enable row level security;
alter table public.linkedin_discovery_logs enable row level security;
drop policy if exists "workspace members manage linkedin discovery runs" on public.linkedin_discovery_runs;
create policy "workspace members manage linkedin discovery runs" on public.linkedin_discovery_runs for all to authenticated using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid()))) with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
drop policy if exists "workspace members manage linkedin candidates" on public.linkedin_candidates;
create policy "workspace members manage linkedin candidates" on public.linkedin_candidates for all to authenticated using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid()))) with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
drop policy if exists "workspace members read linkedin logs" on public.linkedin_discovery_logs;
create policy "workspace members read linkedin logs" on public.linkedin_discovery_logs for select to authenticated using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
revoke all on public.linkedin_discovery_runs,public.linkedin_candidates,public.linkedin_discovery_logs from anon;
grant select,insert,update,delete on public.linkedin_discovery_runs,public.linkedin_candidates to authenticated;
grant select on public.linkedin_discovery_logs to authenticated;
grant all on public.linkedin_discovery_runs,public.linkedin_candidates,public.linkedin_discovery_logs to service_role;
