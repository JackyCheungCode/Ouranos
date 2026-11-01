create or replace function public.lead_inbox_set_fingerprint()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.dedupe_fingerprint is null then
  new.dedupe_fingerprint=md5(concat_ws('|',new.record_type,
   coalesce(nullif(lower(trim(new.normalized_domain)),''),''),
   coalesce(nullif(lower(trim(new.normalized_email)),''),''),
   coalesce(nullif(regexp_replace(new.normalized_phone,'[^0-9]','','g'),''),''),
   coalesce(nullif(lower(trim(new.normalized_name)),''),''),
   coalesce(nullif(lower(trim(new.country_code)),''),'')
  ));
 end if;
 return new;
end; $$;
create trigger lead_inbox_fingerprint_before_insert
before insert on public.lead_inbox_records
for each row execute function public.lead_inbox_set_fingerprint();

create or replace function public.lead_inbox_detect_exact_duplicates()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.normalized_domain is not null and new.normalized_domain<>'' then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,old.id,'domain',100
  from public.lead_inbox_records old
  where old.workspace_id=new.workspace_id and old.record_type=new.record_type
   and old.id<>new.id and old.normalized_domain=new.normalized_domain
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 if new.normalized_email is not null and new.normalized_email<>'' then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,old.id,'email',100
  from public.lead_inbox_records old
  where old.workspace_id=new.workspace_id and old.record_type=new.record_type
   and old.id<>new.id and old.normalized_email=new.normalized_email
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 if new.normalized_phone is not null and new.normalized_phone<>'' then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,old.id,'phone',98
  from public.lead_inbox_records old
  where old.workspace_id=new.workspace_id and old.record_type=new.record_type
   and old.id<>new.id and old.normalized_phone=new.normalized_phone
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 if new.normalized_name is not null and new.normalized_name<>'' and new.country_code is not null then
  insert into public.lead_inbox_duplicate_candidates(workspace_id,record_id,candidate_record_id,match_type,confidence)
  select new.workspace_id,new.id,old.id,'name_address',92
  from public.lead_inbox_records old
  where old.workspace_id=new.workspace_id and old.record_type=new.record_type
   and old.id<>new.id and old.normalized_name=new.normalized_name
   and old.country_code=new.country_code
   and coalesce(lower(old.address),'')=coalesce(lower(new.address),'')
  on conflict(record_id,candidate_record_id,match_type) do nothing;
 end if;
 return new;
end; $$;
create trigger lead_inbox_duplicate_detection_after_insert
after insert on public.lead_inbox_records
for each row execute function public.lead_inbox_detect_exact_duplicates();
