create index if not exists lead_task_runs_provider_cost_idx
 on public.lead_task_runs(workspace_id,provider_key,cost_currency,completed_at desc);
create or replace view public.lead_provider_cost_summary
with (security_invoker=true) as
select workspace_id,provider_key,cost_currency,
 count(*)::bigint as run_count,
 count(*) filter(where status='completed')::bigint as completed_runs,
 count(*) filter(where status='failed')::bigint as failed_runs,
 coalesce(sum(estimated_cost),0)::numeric as estimated_total,
 coalesce(sum(actual_cost),0)::numeric as actual_total,
 coalesce(sum(records_found),0)::bigint as records_found,
 max(completed_at) as last_completed_at
from public.lead_task_runs
group by workspace_id,provider_key,cost_currency;
grant select on public.lead_provider_cost_summary to authenticated,service_role;