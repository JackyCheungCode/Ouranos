create or replace function public.integration_secret_create(p_secret text,p_name text,p_description text)
returns uuid language sql security definer set search_path='' as $$
 select vault.create_secret(p_secret,p_name,p_description);
$$;
create or replace function public.integration_secret_update(p_secret_id uuid,p_secret text,p_name text,p_description text)
returns void language sql security definer set search_path='' as $$
 select vault.update_secret(p_secret_id,p_secret,p_name,p_description);
$$;
create or replace function public.integration_secret_delete(p_secret_id uuid)
returns void language sql security definer set search_path='' as $$
 delete from vault.secrets where id=p_secret_id;
$$;
revoke all on function public.integration_secret_create(text,text,text) from public,anon,authenticated;
revoke all on function public.integration_secret_update(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.integration_secret_delete(uuid) from public,anon,authenticated;
grant execute on function public.integration_secret_create(text,text,text) to service_role;
grant execute on function public.integration_secret_update(uuid,text,text,text) to service_role;
grant execute on function public.integration_secret_delete(uuid) to service_role;
