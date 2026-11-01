create table public.discovery_adapter_catalog (
 id uuid primary key default gen_random_uuid(),
 provider_key text not null,
 channel_key text not null,
 adapter_key text not null unique,
 adapter_name text not null,
 adapter_version text not null default '1.0.0',
 provider_product_type text,
 external_actor_id text,
 supported_record_types text[] not null default '{company,contact}',
 execution_mode text not null default 'async' check (execution_mode in ('sync','async','webhook')),
 input_schema jsonb not null default '{}'::jsonb,
 output_schema jsonb not null default '{}'::jsonb,
 field_mapping jsonb not null default '{}'::jsonb,
 capabilities jsonb not null default '{}'::jsonb,
 pricing_model jsonb not null default '{}'::jsonb,
 max_concurrency integer not null default 1 check (max_concurrency>0),
 verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','restricted','deprecated')),
 terms_url text,
 docs_url text,
 is_active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(provider_key,channel_key,adapter_key)
);
alter table public.discovery_adapter_catalog enable row level security;
revoke all on public.discovery_adapter_catalog from anon, authenticated;
grant select,insert,update,delete on public.discovery_adapter_catalog to service_role;

alter table public.lead_task_runs
 add column if not exists adapter_key text,
 add column if not exists adapter_version text,
 add column if not exists provider_actor_id text,
 add column if not exists adapter_config_snapshot jsonb not null default '{}'::jsonb,
 add column if not exists input_payload jsonb not null default '{}'::jsonb,
 add column if not exists field_mapping_snapshot jsonb not null default '{}'::jsonb,
 add column if not exists attempt_count integer not null default 0 check (attempt_count>=0),
 add column if not exists max_attempts integer not null default 3 check (max_attempts>=1),
 add column if not exists next_retry_at timestamptz,
 add column if not exists idempotency_key text,
 add column if not exists usage_metrics jsonb not null default '{}'::jsonb,
 add column if not exists billing_details jsonb not null default '{}'::jsonb;
create index if not exists lead_task_runs_adapter_status_idx on public.lead_task_runs(adapter_key,status,next_retry_at);
create unique index if not exists lead_task_runs_idempotency_idx on public.lead_task_runs(workspace_id,idempotency_key) where idempotency_key is not null;
