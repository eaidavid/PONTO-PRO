-- Limpeza automática para o banco não crescer sem fim (roda todo dia às 03:15 de Brasília = 06:15 UTC).
-- Histórico de versões: 90 dias. Erros do app: 30 dias. Registro de notificações: 60 dias.

create index if not exists audit_log_em on public.audit_log (em);
create index if not exists notification_log_dia on public.notification_log (dia);

create or replace function public.limpar_historico() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.audit_log where em < now() - interval '90 days';
  delete from public.client_errors where em < now() - interval '30 days';
  delete from public.notification_log where dia < (now() at time zone 'America/Sao_Paulo')::date - 60;
end $$;
revoke execute on function public.limpar_historico() from public, anon, authenticated;

select cron.schedule('pingou-limpeza', '15 6 * * *', $$select public.limpar_historico()$$);
