create or replace function public.claim_lead_task_runs(p_limit integer default 10,p_worker_id text default 'worker')
returns setof public.lead_task_runs
language plpgsql security definer set search_path='' as $$
declare adapter_row record; run_row record; claimed public.lead_task_runs%rowtype; active_count integer; slots integer; total_claimed integer:=0;
begin
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'p_limit must be between 1 and 100'; end if;
 if p_worker_id is null or length(p_worker_id)<1 or length(p_worker_id)>128 then raise exception 'invalid worker id'; end if;
 for adapter_row in
  select c.adapter_key,c.max_concurrency
  from public.discovery_adapter_catalog c
  where c.is_active=true and exists(
   select 1 from public.lead_task_runs r
   join public.lead_search_tasks t on t.id=r.task_id
   where r.adapter_key=c.adapter_key and t.status in ('queued','running')
    and ((r.status='queued' and coalesce(r.next_retry_at,'-infinity'::timestamptz)<=now())
      or (r.status='running' and r.lease_expires_at<=now()))
    and r.attempt_count<r.max_attempts
  )
  order by c.adapter_key
  for update of c skip locked
 loop
  exit when total_claimed>=p_limit;
  select count(*) into active_count from public.lead_task_runs r
   where r.adapter_key=adapter_row.adapter_key and r.status='running' and r.lease_expires_at>now();
  slots:=least(p_limit-total_claimed,greatest(0,adapter_row.max_concurrency-active_count));
  if slots<=0 then continue; end if;
  for run_row in
   select r.id from public.lead_task_runs r
   join public.lead_search_tasks t on t.id=r.task_id
   where r.adapter_key=adapter_row.adapter_key and t.status in ('queued','running')
    and ((r.status='queued' and coalesce(r.next_retry_at,'-infinity'::timestamptz)<=now())
      or (r.status='running' and r.lease_expires_at<=now()))
    and r.attempt_count<r.max_attempts
   order by r.created_at
   for update of r skip locked
   limit slots
  loop
   update public.lead_task_runs
   set status='running',
    attempt_count=case when provider_job_id is null then attempt_count+1 else attempt_count end,
    locked_by=p_worker_id,lease_expires_at=now()+interval '3 minutes',
    started_at=coalesce(started_at,now()),next_retry_at=null,updated_at=now()
   where id=run_row.id returning * into claimed;
   return next claimed;total_claimed:=total_claimed+1;
  end loop;
 end loop;
 return;
end; $$;
revoke all on function public.claim_lead_task_runs(integer,text) from public,anon,authenticated;
grant execute on function public.claim_lead_task_runs(integer,text) to service_role;