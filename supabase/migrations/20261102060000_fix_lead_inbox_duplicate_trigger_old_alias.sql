create or replace function public.lead_inbox_detect_exact_duplicates()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
 if new.normalized_domain is not null and new.normalized_domain<>'' then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,existing_record.id,'domain',100
  from public.lead_inbox_records as existing_record
  where existing_record.workspace_id=new.workspace_id and existing_record.record_type=new.record_type
   and existing_record.id<>new.id and existing_record.normalized_domain=new.normalized_domain
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 if new.normalized_email is not null and new.normalized_email<>'' then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,existing_record.id,'email',100
  from public.lead_inbox_records as existing_record
  where existing_record.workspace_id=new.workspace_id and existing_record.record_type=new.record_type
   and existing_record.id<>new.id and existing_record.normalized_email=new.normalized_email
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 if new.normalized_phone is not null and new.normalized_phone<>'' then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,existing_record.id,'phone',98
  from public.lead_inbox_records as existing_record
  where existing_record.workspace_id=new.workspace_id and existing_record.record_type=new.record_type
   and existing_record.id<>new.id and existing_record.normalized_phone=new.normalized_phone
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 if new.normalized_name is not null and new.normalized_name<>'' and new.country_code is not null then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,existing_record.id,'name_address',92
  from public.lead_inbox_records as existing_record
  where existing_record.workspace_id=new.workspace_id and existing_record.record_type=new.record_type
   and existing_record.id<>new.id and existing_record.normalized_name=new.normalized_name
   and existing_record.country_code=new.country_code
   and coalesce(lower(existing_record.address),'')=coalesce(lower(new.address),'')
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 return new;
end;
$function$;
