create table public.integration_events (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 provider_key text not null,
 provider_name text not null,
 action text not null check(action in ('save','update','delete','test')),
 status text not null check(status in ('success','failure','pending')),
 message text,
 details jsonb not null default '{}'::jsonb,
 duration_ms integer check(duration_ms is null or duration_ms>=0),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index integration_events_workspace_time_idx on public.integration_events(workspace_id,created_at desc);
create index integration_events_provider_idx on public.integration_events(workspace_id,provider_key,created_at desc);
alter table public.integration_events enable row level security;
create policy "workspace members can read integration events" on public.integration_events
 for select to authenticated using(workspace_id in(select workspace_id from public.workspace_members where user_id=(select auth.uid())));
grant select on public.integration_events to authenticated;
grant select,insert,update,delete on public.integration_events to service_role;

revoke all on public.integration_connections from anon,authenticated;
grant select(id,workspace_id,provider_key,provider_name,category,status,is_enabled,config,last_tested_at,last_error,created_at,updated_at)
 on public.integration_connections to authenticated;
revoke all on public.ai_model_configs from anon,authenticated;
grant select(id,workspace_id,provider_key,provider_name,model_name,base_url,is_default,is_enabled,status,options,last_tested_at,last_error,created_at,updated_at)
 on public.ai_model_configs to authenticated;
