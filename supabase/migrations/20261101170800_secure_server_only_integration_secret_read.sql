create or replace function public.integration_secret_read(p_secret_id uuid)
returns text language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where id=p_secret_id;
$$;
revoke all on function public.integration_secret_read(uuid) from public,anon,authenticated;
grant execute on function public.integration_secret_read(uuid) to service_role;