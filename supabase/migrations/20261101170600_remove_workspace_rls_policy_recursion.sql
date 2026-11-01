create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select (select auth.uid()) is not null and exists(
 select 1 from public.workspace_members wm where wm.workspace_id=p_workspace_id and wm.user_id=(select auth.uid())
); $$;
create or replace function private.is_workspace_owner(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select (select auth.uid()) is not null and exists(
 select 1 from public.workspaces w where w.id=p_workspace_id and w.owner_id=(select auth.uid())
); $$;
revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.is_workspace_owner(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_owner(uuid) to authenticated;

drop policy if exists "workspace owners can read workspace" on public.workspaces;
drop policy if exists "members can read workspace membership" on public.workspace_members;
drop policy if exists "workspace owners can add members" on public.workspace_members;
drop policy if exists "workspace owners can remove members" on public.workspace_members;

create policy "workspace members can read workspace" on public.workspaces for select to authenticated
 using (owner_id=(select auth.uid()) or private.is_workspace_member(id));
create policy "users can read own membership or owners can read workspace members" on public.workspace_members for select to authenticated
 using (user_id=(select auth.uid()) or private.is_workspace_owner(workspace_id));
create policy "workspace owners can add members" on public.workspace_members for insert to authenticated
 with check (private.is_workspace_owner(workspace_id));
create policy "workspace owners can remove members" on public.workspace_members for delete to authenticated
 using (private.is_workspace_owner(workspace_id));
