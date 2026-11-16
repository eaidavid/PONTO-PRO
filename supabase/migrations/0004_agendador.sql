-- Agendador das notificações sem depender do cron pago da Vercel:
-- o próprio Postgres (pg_cron + pg_net) chama a rota do app a cada 5 minutos.
--
-- ANTES de rodar, guarde no Vault a URL do app e o token (o mesmo de CRON_TOKEN na Vercel),
-- pelo SQL Editor, sem salvar em arquivo:
--   select vault.create_secret('https://SEU-DOMINIO', 'pingou_app_url');
--   select vault.create_secret('UM-TEXTO-LONGO-E-ALEATORIO', 'pingou_cron_token');

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.chamar_notificacoes() returns void
language plpgsql security definer set search_path = '' as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'pingou_app_url');
  token text := (select decrypted_secret from vault.decrypted_secrets where name = 'pingou_cron_token');
begin
  if url is null or token is null then
    return;
  end if;
  perform net.http_post(
    url := url || '/api/notificacoes/enviar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end $$;
-- só o agendador chama
revoke execute on function public.chamar_notificacoes() from public, anon, authenticated;

select cron.schedule('pingou-notificacoes', '*/5 * * * *', $$select public.chamar_notificacoes()$$);
