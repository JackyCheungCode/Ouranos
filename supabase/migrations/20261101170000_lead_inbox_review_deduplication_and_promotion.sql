create table public.lead_inbox_records (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid references public.lead_search_tasks(id) on delete set null,
 record_type text not null check (record_type in ('company','contact')),
 review_status text not null default 'pending' check (review_status in ('pending','approved','rejected','duplicate','promoted')),
 company_inbox_id uuid references public.lead_inbox_records(id) on delete set null,
 source_record_id uuid references public.lead_source_records(id) on delete set null,
 display_name text not null, normalized_name text, normalized_domain text, normalized_email text, normalized_phone text,
 country_code text, country_name text, website text, email text, phone text, job_title text, department text, address text,
 product_categories text[] not null default '{}', social_links jsonb not null default '{}'::jsonb,
 employee_range text, description text, raw_payload jsonb not null default '{}'::jsonb,
 normalized_payload jsonb not null default '{}'::jsonb, dedupe_fingerprint text,
 duplicate_of uuid references public.lead_inbox_records(id) on delete set null,
 duplicate_confidence numeric(5,2) check (duplicate_confidence between 0 and 100),
 ai_score numeric(5,2) check (ai_score between 0 and 100), ai_summary text,
 promoted_company_id uuid references public.lead_companies(id) on delete set null,
 promoted_contact_id uuid references public.lead_contacts(id) on delete set null,
 reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
 promoted_by uuid references auth.users(id) on delete set null, promoted_at timestamptz,
 discovered_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((record_type='company' and company_inbox_id is null) or record_type='contact')
);
create index lead_inbox_workspace_status_idx on public.lead_inbox_records(workspace_id,review_status,discovered_at desc);
create index lead_inbox_workspace_task_idx on public.lead_inbox_records(workspace_id,task_id);
create index lead_inbox_dedupe_idx on public.lead_inbox_records(workspace_id,dedupe_fingerprint) where dedupe_fingerprint is not null;
create index lead_inbox_domain_idx on public.lead_inbox_records(workspace_id,normalized_domain) where normalized_domain is not null;
create index lead_inbox_email_idx on public.lead_inbox_records(workspace_id,normalized_email) where normalized_email is not null;
create table public.lead_inbox_duplicate_candidates (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 record_id uuid not null references public.lead_inbox_records(id) on delete cascade,
 candidate_record_id uuid not null references public.lead_inbox_records(id) on delete cascade,
 match_type text not null check (match_type in ('domain','email','phone','name_address','fuzzy_name','manual')),
 confidence numeric(5,2) not null check (confidence between 0 and 100),
 resolution text not null default 'unresolved' check (resolution in ('unresolved','same_entity','different_entity','merged')),
 resolved_by uuid references auth.users(id) on delete set null, resolved_at timestamptz,
 created_at timestamptz not null default now(), check (record_id<>candidate_record_id),
 unique(record_id,candidate_record_id,match_type)
);
create index lead_inbox_duplicates_workspace_idx on public.lead_inbox_duplicate_candidates(workspace_id,resolution);
create table public.lead_inbox_review_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 record_id uuid not null references public.lead_inbox_records(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check (action in ('approve','reject','mark_duplicate','unmark_duplicate','promote','edit')),
 note text, changes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index lead_inbox_events_record_idx on public.lead_inbox_review_events(workspace_id,record_id,created_at desc);
alter table public.lead_inbox_records enable row level security;
alter table public.lead_inbox_duplicate_candidates enable row level security;
alter table public.lead_inbox_review_events enable row level security;
create policy "workspace members manage lead inbox records" on public.lead_inbox_records for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members manage inbox duplicate candidates" on public.lead_inbox_duplicate_candidates for all to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())))
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members read inbox review events" on public.lead_inbox_review_events for select to authenticated
 using (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
create policy "workspace members append inbox review events" on public.lead_inbox_review_events for insert to authenticated
 with check (workspace_id in (select workspace_id from public.workspace_members where user_id=(select auth.uid())));
grant select,insert,update,delete on public.lead_inbox_records to authenticated;
grant select,insert,update,delete on public.lead_inbox_duplicate_candidates to authenticated;
grant select,insert on public.lead_inbox_review_events to authenticated;
create or replace function public.promote_lead_inbox_record(p_record_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r public.lead_inbox_records%rowtype; company_id uuid; contact_id uuid;
begin
 select * into r from public.lead_inbox_records where id=p_record_id for update;
 if not found then raise exception 'Inbox record not found'; end if;
 if not exists (select 1 from public.workspace_members wm where wm.workspace_id=r.workspace_id and wm.user_id=(select auth.uid()))
 and not exists (select 1 from public.workspaces w where w.id=r.workspace_id and w.owner_id=(select auth.uid()))
 then raise exception 'Workspace access denied'; end if;
 if r.review_status not in ('approved','promoted') then raise exception 'Record must be approved before promotion'; end if;
 if r.review_status='promoted' then return jsonb_build_object('ok',true,'already_promoted',true,'company_id',r.promoted_company_id,'contact_id',r.promoted_contact_id); end if;
 if r.record_type='company' then
  insert into public.lead_companies(workspace_id,company_name,normalized_name,country,website,normalized_domain,email,phone,social_links,product_categories,address,employee_range,description,ai_score,ai_summary)
  values(r.workspace_id,r.display_name,r.normalized_name,r.country_name,r.website,r.normalized_domain,r.email,r.phone,r.social_links,r.product_categories,r.address,r.employee_range,r.description,r.ai_score,r.ai_summary)
  on conflict (workspace_id,normalized_domain) where normalized_domain is not null and normalized_domain<>''
  do update set company_name=coalesce(nullif(excluded.company_name,''),lead_companies.company_name),
   email=coalesce(lead_companies.email,excluded.email),phone=coalesce(lead_companies.phone,excluded.phone),
   website=coalesce(lead_companies.website,excluded.website),updated_at=now()
  returning id into company_id;
  update public.lead_inbox_records set promoted_company_id=company_id where id=p_record_id;
 else
  if r.company_inbox_id is not null then select promoted_company_id into company_id from public.lead_inbox_records
   where id=r.company_inbox_id and workspace_id=r.workspace_id and record_type='company'; end if;
  insert into public.lead_contacts(workspace_id,company_id,full_name,job_title,department,email,phone,linkedin_url,country)
  values(r.workspace_id,company_id,r.display_name,r.job_title,r.department,r.email,r.phone,nullif(r.social_links->>'linkedin',''),r.country_name)
  returning id into contact_id;
 end if;
 update public.lead_inbox_records set review_status='promoted',promoted_company_id=coalesce(company_id,promoted_company_id),
  promoted_contact_id=contact_id,promoted_by=(select auth.uid()),promoted_at=now(),updated_at=now() where id=p_record_id;
 insert into public.lead_inbox_review_events(workspace_id,record_id,actor_id,action)
 values(r.workspace_id,p_record_id,(select auth.uid()),'promote');
 return jsonb_build_object('ok',true,'company_id',company_id,'contact_id',contact_id);
end; $$;
revoke all on function public.promote_lead_inbox_record(uuid) from public, anon;
grant execute on function public.promote_lead_inbox_record(uuid) to authenticated;
