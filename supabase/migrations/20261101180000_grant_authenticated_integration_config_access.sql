-- Allow signed-in workspace members to access integration metadata.
-- Row access remains restricted by the existing workspace-scoped RLS policies.
grant select, insert, update, delete on table public.ai_model_configs to authenticated;
grant select, insert, update, delete on table public.integration_connections to authenticated;
