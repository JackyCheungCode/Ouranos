create index if not exists discovery_adapter_provider_channel_active_idx
 on public.discovery_adapter_catalog(provider_key,channel_key,is_active,verification_status);
alter table public.lead_task_runs
 add constraint lead_task_runs_adapter_key_fkey
 foreign key(adapter_key) references public.discovery_adapter_catalog(adapter_key) on delete restrict not valid;
alter table public.lead_task_runs validate constraint lead_task_runs_adapter_key_fkey;