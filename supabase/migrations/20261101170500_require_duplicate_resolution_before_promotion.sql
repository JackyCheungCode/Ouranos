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
 if exists(select 1 from public.lead_inbox_duplicate_candidates d where d.workspace_id=r.workspace_id and d.record_id=r.id and d.resolution='unresolved') then
  raise exception 'Resolve duplicate candidates before promotion';
 end if;
 if r.record_type='company' then
  insert into public.lead_companies(workspace_id,company_name,normalized_name,country,website,normalized_domain,email,phone,social_links,product_categories,address,employee_range,description,ai_score,ai_summary)
  values(r.workspace_id,r.display_name,r.normalized_name,r.country_name,r.website,r.normalized_domain,r.email,r.phone,r.social_links,r.product_categories,r.address,r.employee_range,r.description,r.ai_score,r.ai_summary)
  on conflict (workspace_id,normalized_domain) where normalized_domain is not null and normalized_domain<>''
  do update set company_name=coalesce(nullif(excluded.company_name,''),lead_companies.company_name),
   email=coalesce(lead_companies.email,excluded.email),phone=coalesce(lead_companies.phone,excluded.phone),
   website=coalesce(lead_companies.website,excluded.website),updated_at=now()
  returning id into company_id;
 else
  if r.company_inbox_id is not null then
   select promoted_company_id into company_id from public.lead_inbox_records
   where id=r.company_inbox_id and workspace_id=r.workspace_id and record_type='company' and review_status='promoted';
   if company_id is null then raise exception 'Promote the related company before this contact'; end if;
  end if;
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
