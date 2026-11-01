create policy "workspace members can read selected adapter schemas" on public.discovery_adapter_catalog
 for select to authenticated using (
  exists(select 1 from public.workspace_adapter_selections s
   where s.adapter_key=discovery_adapter_catalog.adapter_key
   and private.is_workspace_member(s.workspace_id))
 );
grant select on public.discovery_adapter_catalog to authenticated;