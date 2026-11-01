create or replace function public.add_workspace_owner_member()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.workspace_members(workspace_id,user_id,role)
 values (new.id,new.owner_id,'owner')
 on conflict (workspace_id,user_id) do nothing;
 return new;
end;
$$;
revoke all on function public.add_workspace_owner_member() from public,anon,authenticated;
drop trigger if exists workspace_owner_membership_after_insert on public.workspaces;
create trigger workspace_owner_membership_after_insert
after insert on public.workspaces
for each row execute function public.add_workspace_owner_member();
