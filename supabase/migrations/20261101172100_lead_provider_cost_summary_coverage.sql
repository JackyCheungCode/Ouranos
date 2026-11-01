drop view public.lead_provider_cost_summary;
create view public.lead_provider_cost_summary
with (security_invoker=true) as
select workspace_id,provider_key,cost_currency,
 count(*)::bigint as run_count,
 count(*) filter(where status='completed')::bigint as completed_runs,
 count(*) filter(where status='failed')::bigint as failed_runs,
 coalesce(sum(estimated_cost),0)::numeric as estimated_total,
 coalesce(sum(actual_cost),0)::numeric as actual_total,
 coalesce(sum(records_found),0)::bigint as records_found,
 max(completed_at) as last_completed_at,
 count(estimated_cost)::bigint as estimated_cost_runs,
 count(actual_cost)::bigint as actual_cost_runs,
 count(*) filter(where actual_cost is null)::bigint as unpriced_runs
from public.lead_task_runs
group by workspace_id,provider_key,cost_currency;
grant select on public.lead_provider_cost_summary to authenticated,service_role;