create extension if not exists pgcrypto;

create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 owner_id uuid not null references auth.users(id) on delete restrict,
 settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check (role in ('owner','admin','manager','member','viewer')),
 created_at timestamptz not null default now(), primary key (workspace_id,user_id)
);
create table public.integration_connections (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 provider_key text not null, provider_name text not null,
 category text not null check (category in ('data_source','automation','website_crawling','ecommerce','other')),
 status text not null default 'not_connected' check (status in ('not_connected','configured','connected','error','disabled')),
 is_enabled boolean not null default false, config jsonb not null default '{}'::jsonb, secret_ref text,
 last_tested_at timestamptz, last_error text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(workspace_id,provider_key)
);
create table public.ai_model_configs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 provider_key text not null, provider_name text not null, model_name text not null, base_url text, secret_ref text,
 is_default boolean not null default false, is_enabled boolean not null default false,
 status text not null default 'not_configured' check (status in ('not_configured','configured','connected','error','disabled')),
 options jsonb not null default '{}'::jsonb, last_tested_at timestamptz, last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,provider_key,model_name)
);
create unique index ai_model_one_default_per_workspace on public.ai_model_configs(workspace_id) where is_default=true;
create table public.lead_search_tasks (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 created_by uuid references auth.users(id) on delete set null, name text not null,
 status text not null default 'draft' check (status in ('draft','queued','running','completed','failed','cancelled','paused')),
 target_profile jsonb not null default '{}'::jsonb, selected_channels text[] not null default '{}',
 target_count integer not null default 500 check (target_count>0), discovered_count integer not null default 0 check (discovered_count>=0),
 unique_company_count integer not null default 0 check (unique_company_count>=0),
 unique_contact_count integer not null default 0 check (unique_contact_count>=0),
 estimated_cost numeric(12,4), actual_cost numeric(12,4), started_at timestamptz, completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.lead_companies (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 company_name text not null, normalized_name text, country text, region text, website text, normalized_domain text,
 email text, phone text, social_links jsonb not null default '{}'::jsonb, product_categories text[] not null default '{}',
 address text, employee_range text, description text, company_size text,
 status text not null default 'new' check (status in ('new','qualified','disqualified','customer','archived')),
 ai_score numeric(5,2) check (ai_score between 0 and 100), ai_summary text,
 first_discovered_at timestamptz not null default now(), last_enriched_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index lead_companies_workspace_domain_unique on public.lead_companies(workspace_id,normalized_domain)
 where normalized_domain is not null and normalized_domain<>'';
create index lead_companies_workspace_name_idx on public.lead_companies(workspace_id,normalized_name);
create table public.lead_contacts (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 company_id uuid references public.lead_companies(id) on delete set null, full_name text not null,
 job_title text, department text, email text, phone text, linkedin_url text, country text,
 verification_status text not null default 'unknown' check (verification_status in ('unknown','valid','invalid','risky')),
 source_confidence numeric(5,2) check (source_confidence between 0 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index lead_contacts_workspace_company_idx on public.lead_contacts(workspace_id,company_id);
create table public.lead_source_records (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid references public.lead_search_tasks(id) on delete set null,
 company_id uuid references public.lead_companies(id) on delete set null,
 contact_id uuid references public.lead_contacts(id) on delete set null,
 provider_key text not null, channel_key text not null, external_record_id text, source_url text, source_title text,
 confidence numeric(5,2) check (confidence between 0 and 100), raw_payload jsonb not null default '{}'::jsonb,
 discovered_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index lead_source_records_task_idx on public.lead_source_records(workspace_id,task_id);
create index lead_source_records_company_idx on public.lead_source_records(workspace_id,company_id);
create table public.lead_task_runs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid not null references public.lead_search_tasks(id) on delete cascade,
 provider_key text not null, channel_key text not null,
 status text not null default 'queued' check (status in ('queued','running','completed','failed','skipped','cancelled')),
 provider_job_id text, records_found integer not null default 0, error_message text,
 estimated_cost numeric(12,4), actual_cost numeric(12,4), started_at timestamptz, completed_at timestamptz,
 created_at timestamptz not null default now()
);
create index lead_task_runs_task_idx on public.lead_task_runs(workspace_id,task_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.integration_connections enable row level security;
alter table public.ai_model_configs enable row level security;
alter table public.lead_search_tasks enable row level security;
alter table public.lead_companies enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.lead_source_records enable row level security;
alter table public.lead_task_runs enable row level security;

create policy "workspace owners can read workspace" on public.workspaces for select to authenticated
 using (owner_id=(select auth.uid()) or id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace owners can update workspace" on public.workspaces for update to authenticated
 using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "users can create own workspace" on public.workspaces for insert to authenticated with check (owner_id=(select auth.uid()));
create policy "members can read workspace membership" on public.workspace_members for select to authenticated
 using (user_id=(select auth.uid()) or workspace_id in (select id from public.workspaces where owner_id=(select auth.uid())));
create policy "workspace owners can add members" on public.workspace_members for insert to authenticated
 with check (workspace_id in (select id from public.workspaces where owner_id=(select auth.uid())));
create policy "workspace owners can remove members" on public.workspace_members for delete to authenticated
 using (workspace_id in (select id from public.workspaces where owner_id=(select auth.uid())));

create policy "workspace members manage integration connections" on public.integration_connections for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members manage AI model configs" on public.ai_model_configs for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members manage lead search tasks" on public.lead_search_tasks for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members manage lead companies" on public.lead_companies for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members manage lead contacts" on public.lead_contacts for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members manage lead source records" on public.lead_source_records for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members manage lead task runs" on public.lead_task_runs for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));

grant select,insert,update,delete on public.workspaces to authenticated;
grant select,insert,update,delete on public.workspace_members to authenticated;
grant select,insert,update,delete on public.integration_connections to authenticated;
grant select,insert,update,delete on public.ai_model_configs to authenticated;
grant select,insert,update,delete on public.lead_search_tasks to authenticated;
grant select,insert,update,delete on public.lead_companies to authenticated;
grant select,insert,update,delete on public.lead_contacts to authenticated;
grant select,insert,update,delete on public.lead_source_records to authenticated;
grant select,insert,update,delete on public.lead_task_runs to authenticated;
