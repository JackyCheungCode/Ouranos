create table public.workspace_adapter_selections (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 adapter_key text not null references public.discovery_adapter_catalog(adapter_key) on delete restrict,
 channel_key text not null,
 is_enabled boolean not null default false,
 priority integer not null default 100,
 config jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,adapter_key)
);
create index workspace_adapter_selections_channel_idx on public.workspace_adapter_selections(workspace_id,channel_key,is_enabled,priority);
create index workspace_adapter_selections_created_by_idx on public.workspace_adapter_selections(created_by) where created_by is not null;
alter table public.workspace_adapter_selections enable row level security;
create policy "workspace members manage adapter selections" on public.workspace_adapter_selections for all to authenticated
 using(workspace_id in(select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check(workspace_id in(select workspace_id from public.workspace_members where user_id=(select auth.uid())));
grant select,insert,update,delete on public.workspace_adapter_selections to authenticated;
