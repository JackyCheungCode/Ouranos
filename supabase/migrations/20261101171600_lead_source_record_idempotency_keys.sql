alter table public.lead_inbox_records add column if not exists source_item_key text;
create unique index if not exists lead_source_records_external_identity_uidx
 on public.lead_source_records(workspace_id,provider_key,channel_key,external_record_id)
 where external_record_id is not null and external_record_id<>'';
create unique index if not exists lead_inbox_source_item_uidx
 on public.lead_inbox_records(workspace_id,source_record_id,record_type,source_item_key)
 where source_record_id is not null and source_item_key is not null;