create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists lead_search_tasks_workspace_id_idx on public.lead_search_tasks(workspace_id);
create index if not exists lead_search_tasks_created_by_idx on public.lead_search_tasks(created_by);
create index if not exists lead_companies_workspace_id_idx on public.lead_companies(workspace_id);
create index if not exists lead_contacts_company_id_idx on public.lead_contacts(company_id);
create index if not exists lead_source_records_task_id_idx on public.lead_source_records(task_id);
create index if not exists lead_source_records_company_id_idx on public.lead_source_records(company_id);
create index if not exists lead_source_records_contact_id_idx on public.lead_source_records(contact_id);
create index if not exists lead_task_runs_task_id_idx on public.lead_task_runs(task_id);
do $$
begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke all on function public.rls_auto_enable() from public';
  execute 'revoke all on function public.rls_auto_enable() from anon';
  execute 'revoke all on function public.rls_auto_enable() from authenticated';
 end if;
end $$;
