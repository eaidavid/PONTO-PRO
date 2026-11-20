-- Avisos do Supabase (segurança e desempenho) e lista de espera do Pro.

-- ---------- regras de acesso: auth.uid() calculado uma vez por consulta, não por linha ----------
do $$
declare t text;
begin
  foreach t in array array['work_profiles', 'day_entries', 'production_items', 'production_entries', 'settings'] loop
    execute format('drop policy if exists "meus dados: ler" on public.%I', t);
    execute format('drop policy if exists "meus dados: criar" on public.%I', t);
    execute format('drop policy if exists "meus dados: alterar" on public.%I', t);
    execute format('drop policy if exists "meus dados: apagar" on public.%I', t);
    execute format('create policy "meus dados: ler" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "meus dados: criar" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "meus dados: alterar" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "meus dados: apagar" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

drop policy if exists "vejo meu histórico" on public.audit_log;
create policy "vejo meu histórico" on public.audit_log for select to authenticated using (user_id = (select auth.uid()));

-- ---------- funções internas: ninguém de fora chama ----------
-- funções de gatilho só rodam pelo gatilho
revoke execute on function public.criar_conta_do_usuario() from public, anon, authenticated;
revoke execute on function public.manter_mais_recente() from public, anon, authenticated;
-- as do app só para quem entrou na conta
revoke execute on function public.minhas_contas() from public, anon;
revoke execute on function public.apagar_meus_dados() from public, anon;
grant execute on function public.minhas_contas() to authenticated;
grant execute on function public.apagar_meus_dados() to authenticated;

-- ---------- índices das ligações com a conta ----------
create index if not exists client_errors_user on public.client_errors (user_id);
create index if not exists support_requests_user on public.support_requests (user_id);

-- ---------- lista de espera também para o Pro (antes de a cobrança abrir) ----------
alter table public.waitlist drop constraint if exists waitlist_plano_check;
alter table public.waitlist add constraint waitlist_plano_check check (plano in ('equipe', 'individual'));

-- ---------- pg_net fora do esquema público (só no Supabase, onde a extensão existe) ----------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_net' and extnamespace = 'public'::regnamespace) then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end $$;

-- ---------- metas do beta (Visão geral do painel) ----------
-- ativação: aparelhos que terminaram o começo e bateram o 1º ponto em até 24h (janela já fechada)
-- uso no 7º dia: contas criadas há 7 a 37 dias que ainda usaram 7 dias ou mais depois de criadas
create or replace function public.admin_metas() returns jsonb
language sql stable security definer set search_path = '' as $$
  with comecos as (
    select c.aparelho, min(c.em) as em from public.app_events c
    where c.evento = 'comecar_concluido' and c.em > now() - interval '30 days' and c.em < now() - interval '24 hours'
    group by c.aparelho
  ),
  contas as (
    select u.id, u.created_at, uso.ultimo from auth.users u
    left join public.admin_ultimo_uso() uso on uso.user_id = u.id
    where u.created_at between now() - interval '37 days' and now() - interval '7 days'
  )
  select jsonb_build_object(
    'comecos', (select count(*) from comecos),
    'ativados', (select count(*) from comecos c where exists (
      select 1 from public.app_events p where p.aparelho = c.aparelho and p.evento = 'primeiro_ponto' and p.em between c.em and c.em + interval '24 hours'
    )),
    'contas7', (select count(*) from contas),
    'voltaram7', (select count(*) from contas where ultimo >= created_at + interval '7 days')
  )
$$;
revoke execute on function public.admin_metas() from public, anon, authenticated;
grant execute on function public.admin_metas() to service_role;
