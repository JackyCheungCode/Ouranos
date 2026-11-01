create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
 'ouranos-discovery-worker',
 '* * * * *',
 $job$
 select net.http_post(
  url := 'https://riridqzemfcnnjfiqevm.supabase.co/functions/v1/discovery-worker',
  headers := jsonb_build_object(
   'Content-Type','application/json',
   'x-worker-secret',(select decrypted_secret from vault.decrypted_secrets where id='8052bb93-5044-4e23-a0ac-481bfb7fbadf')
  ),
  body := jsonb_build_object('limit',10)
 );
 $job$
);