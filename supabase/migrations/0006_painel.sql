-- Painel de administrador: eventos do funil, pedidos de suporte, registro de ações e resumos.
-- Tudo aqui só é lido e gravado pelo servidor (chave de serviço). RLS ligado e sem política:
-- nenhum usuário do app lê essas tabelas.

-- ---------- eventos do funil (sem dado pessoal: evento + aparelho aleatório) ----------
create table public.app_events (
  id bigserial primary key,
  evento text not null check (char_length(evento) between 1 and 40),
  aparelho text not null check (char_length(aparelho) between 1 and 40),
  dados jsonb not null default '{}' check (pg_column_size(dados) <= 2000),
  em timestamptz not null default now()
);
create index app_events_evento_em on public.app_events (evento, em);
create index app_events_em on public.app_events (em);
alter table public.app_events enable row level security;

-- ---------- pedidos de suporte (a pessoa escolhe o que manda) ----------
create table public.support_requests (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete set null,
  email text check (char_length(email) <= 200),
  contato text check (char_length(contato) <= 200),
  mensagem text not null check (char_length(mensagem) between 3 and 2000),
  tecnico jsonb not null default '{}' check (pg_column_size(tecnico) <= 16000),
  -- registros do período, só com autorização; apagados quando vencem
  registros jsonb check (pg_column_size(registros) <= 400000),
  registros_expira timestamptz,
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'fechado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index support_requests_status on public.support_requests (status, criado_em desc);
alter table public.support_requests enable row level security;

-- ---------- registro de ações do painel ----------
create table public.admin_audit (
  id bigserial primary key,
  admin_email text not null,
  acao text not null,
  alvo text,
  detalhes jsonb not null default '{}',
  em timestamptz not null default now()
);
create index admin_audit_alvo on public.admin_audit (alvo, em desc);
alter table public.admin_audit enable row level security;

-- quando a assinatura nasceu (para o funil e as cortesias)
alter table public.subscriptions add column if not exists criado_em timestamptz not null default now();

-- ---------- último uso de cada pessoa ----------
-- maior data entre o último login e a última gravação sincronizada
create or replace function public.admin_ultimo_uso() returns table (user_id uuid, ultimo timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, greatest(
    u.last_sign_in_at,
    (select max(d.atualizado_em) from public.day_entries d where d.user_id = u.id),
    (select max(s.atualizado_em) from public.settings s where s.user_id = u.id),
    (select max(w.atualizado_em) from public.work_profiles w where w.user_id = u.id)
  )
  from auth.users u
$$;

-- ---------- resumo da visão geral ----------
create or replace function public.admin_resumo() returns jsonb
language sql stable security definer set search_path = '' as $$
  with uso as (select * from public.admin_ultimo_uso()),
  inicio as (
    select s.user_id, (s.dados #>> '{}')::date as dia
    from public.settings s
    where s.chave = 'inicioUso' and s.apagado = false and (s.dados #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$'
  ),
  pagantes as (
    select m.user_id from public.subscriptions sub
    join public.members m on m.account_id = sub.account_id and m.papel = 'dono'
    where sub.provedor <> 'cortesia'
  )
  select jsonb_build_object(
    'contas', (select count(*) from auth.users),
    'novas7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'ativas7', (select count(*) from uso where ultimo > now() - interval '7 days'),
    'ativas30', (select count(*) from uso where ultimo > now() - interval '30 days'),
    'testeTerminado', (select count(*) from inicio where dia <= current_date - 14),
    'testeVirouPago', (select count(*) from inicio i where i.dia <= current_date - 14 and i.user_id in (select user_id from pagantes)),
    'emTeste', (select count(*) from inicio i where i.dia > current_date - 14 and i.user_id not in (select user_id from pagantes)),
    'suporteAberto', (select count(*) from public.support_requests where status = 'aberto'),
    'errosHoje', (select count(*) from public.client_errors where em > now() - interval '24 hours'),
    'novasPorDia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'total', (select count(*) from auth.users u where u.created_at::date = d::date)) order by d), '[]')
      from generate_series(current_date - 29, current_date, interval '1 day') d
    )
  )
$$;

-- ---------- lista de pessoas ----------
create or replace function public.admin_pessoas(busca text default '', filtro text default 'todas', limite int default 50, desloc int default 0)
returns table (id uuid, email text, criada timestamptz, ultimo_uso timestamptz, inicio_uso date, plano text, status text, ciclo text, pago_ate date, provedor text, avisos bigint, total bigint)
language sql stable security definer set search_path = '' as $$
  with base as (
    select u.id, u.email::text, u.created_at as criada, uso.ultimo as ultimo_uso,
      (select (s.dados #>> '{}')::date from public.settings s where s.user_id = u.id and s.chave = 'inicioUso' and (s.dados #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$' limit 1) as inicio_uso,
      sub.plano, sub.status, sub.ciclo, sub.pago_ate, sub.provedor,
      (select count(*) from public.push_subscriptions p where p.user_id = u.id) as avisos
    from auth.users u
    left join public.admin_ultimo_uso() uso on uso.user_id = u.id
    left join public.members m on m.user_id = u.id and m.papel = 'dono'
    left join public.subscriptions sub on sub.account_id = m.account_id
    where busca = '' or u.email ilike '%' || busca || '%'
  ), filtrada as (
    select * from base b where
      filtro = 'todas'
      or (filtro = 'ativas' and b.ultimo_uso > now() - interval '7 days')
      or (filtro = 'pro' and b.status in ('ativa', 'atrasada') and b.pago_ate >= current_date)
      or (filtro = 'teste' and b.inicio_uso > current_date - 14 and b.status is null)
      or (filtro = 'paradas' and (b.ultimo_uso is null or b.ultimo_uso < now() - interval '30 days'))
  )
  select f.*, count(*) over () as total from filtrada f
  order by f.criada desc
  limit greatest(1, least(limite, 200)) offset greatest(0, desloc)
$$;

-- ---------- detalhe de uma pessoa (só contagens, nunca os horários) ----------
create or replace function public.admin_pessoa(alvo uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', u.id, 'email', u.email, 'criada', u.created_at, 'ultimoLogin', u.last_sign_in_at,
    'ultimoUso', (select ultimo from public.admin_ultimo_uso() x where x.user_id = u.id),
    'diasRegistrados', (select count(*) from public.day_entries d where d.user_id = u.id and d.apagado = false),
    'lancamentos', (select count(*) from public.production_entries p where p.user_id = u.id and p.apagado = false),
    'area', (select w.dados ->> 'area' from public.work_profiles w where w.user_id = u.id),
    'forma', (select w.dados -> 'pagamento' ->> 'forma' from public.work_profiles w where w.user_id = u.id),
    'avisos', (select count(*) from public.push_subscriptions p where p.user_id = u.id),
    'inicioUso', (select s.dados #>> '{}' from public.settings s where s.user_id = u.id and s.chave = 'inicioUso'),
    'conta', (select m.account_id from public.members m where m.user_id = u.id and m.papel = 'dono' limit 1),
    'assinatura', (
      select to_jsonb(sub) - 'account_id' from public.subscriptions sub
      join public.members m on m.account_id = sub.account_id and m.papel = 'dono'
      where m.user_id = u.id limit 1
    ),
    'acoes', (
      select coalesce(jsonb_agg(jsonb_build_object('em', a.em, 'acao', a.acao, 'admin', a.admin_email, 'detalhes', a.detalhes) order by a.em desc), '[]')
      from public.admin_audit a where a.alvo = u.id::text
    )
  )
  from auth.users u where u.id = alvo
$$;

-- ---------- funil: pessoas (aparelhos) distintas por evento ----------
create or replace function public.admin_funil(desde timestamptz, origem text default '')
returns table (evento text, detalhe text, aparelhos bigint, total bigint)
language sql stable security definer set search_path = '' as $$
  select e.evento, coalesce(e.dados ->> 'secao', e.dados ->> 'origem', '') as detalhe,
    count(distinct e.aparelho), count(*)
  from public.app_events e
  where e.em >= desde and (origem = '' or e.dados ->> 'origem_visita' = origem)
  group by 1, 2
$$;

-- ---------- saúde ----------
create or replace function public.admin_saude() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'erros', (
      select coalesce(jsonb_agg(x order by x.total desc), '[]') from (
        select left(mensagem, 160) as mensagem, count(*) as total, max(em) as ultimo,
          (array_agg(url order by em desc))[1] as url, (array_agg(agente order by em desc))[1] as agente
        from public.client_errors where em > now() - interval '7 days'
        group by 1 order by 2 desc limit 20
      ) x
    ),
    'notificacoes', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'total', total) order by dia desc), '[]') from (
        select dia, count(*) as total from public.notification_log where dia > current_date - 7 group by dia
      ) n
    ),
    'agendador', (
      select coalesce(jsonb_agg(jsonb_build_object('tarefa', j.jobname, 'inicio', r.start_time, 'situacao', r.status, 'mensagem', left(r.return_message, 200)) order by r.start_time desc), '[]')
      from (select * from cron.job_run_details order by start_time desc limit 10) r
      join cron.job j on j.jobid = r.jobid
    )
  )
$$;

-- só o servidor (chave de serviço) chama as funções do painel
do $$
declare f text;
begin
  foreach f in array array['admin_ultimo_uso()', 'admin_resumo()', 'admin_pessoas(text, text, int, int)', 'admin_pessoa(uuid)', 'admin_funil(timestamptz, text)', 'admin_saude()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- a limpeza diária também apaga os registros de suporte vencidos e eventos com mais de 1 ano
create or replace function public.limpar_historico() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.audit_log where em < now() - interval '90 days';
  delete from public.client_errors where em < now() - interval '30 days';
  delete from public.notification_log where dia < (now() at time zone 'America/Sao_Paulo')::date - 60;
  update public.support_requests set registros = null, registros_expira = null where registros_expira < now();
  delete from public.app_events where em < now() - interval '365 days';
end $$;
revoke execute on function public.limpar_historico() from public, anon, authenticated;
