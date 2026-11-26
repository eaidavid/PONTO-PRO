-- Beta fechado: convites que dão Pro de cortesia, e opiniões/depoimentos com aprovação no painel.
-- Só o servidor (chave de serviço) lê e grava. RLS ligado e sem política.

create table public.beta_invites (
  codigo text primary key check (codigo ~ '^[A-Z0-9-]{3,30}$'),
  nome text not null check (char_length(nome) between 1 and 80),
  dias int not null default 90 check (dias between 1 and 366),
  limite int check (limite between 1 and 1000),
  usados int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.beta_invites enable row level security;

create table public.beta_redemptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  codigo text not null references public.beta_invites (codigo) on delete cascade,
  em timestamptz not null default now()
);
create index beta_redemptions_codigo on public.beta_redemptions (codigo);
alter table public.beta_redemptions enable row level security;

-- uma opinião por pessoa com conta (a mais recente vale); sem conta, várias
create table public.feedback (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete set null,
  nota int check (nota between 0 and 10),
  comentario text check (char_length(comentario) <= 1000),
  -- autorização expressa para publicar na página de vendas
  autoriza boolean not null default false,
  nome text check (char_length(nome) <= 40),
  funcao text check (char_length(funcao) <= 40),
  cidade text check (char_length(cidade) <= 60),
  status text not null default 'novo' check (status in ('novo', 'aprovado', 'oculto')),
  criado_em timestamptz not null default now()
);
-- único por pessoa (sem conta, user_id fica nulo e pode repetir); constraint inteira para o upsert funcionar
alter table public.feedback add constraint feedback_user_unico unique (user_id);
create index feedback_status on public.feedback (status, criado_em desc);
alter table public.feedback enable row level security;

-- só depoimento autorizado pode ser aprovado
alter table public.feedback add constraint feedback_aprovado_autorizado check (status <> 'aprovado' or (autoriza and comentario is not null and nome is not null));

-- ---------- resgate do convite: tudo de uma vez, sem estourar o limite ----------
create or replace function public.resgatar_convite(alvo uuid, cod text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.beta_invites;
  conta uuid;
  sub public.subscriptions;
  fim date;
begin
  select * into c from public.beta_invites where codigo = upper(cod) for update;
  if not found or not c.ativo then return jsonb_build_object('ok', false, 'motivo', 'invalido'); end if;
  if exists (select 1 from public.beta_redemptions where user_id = alvo) then return jsonb_build_object('ok', false, 'motivo', 'ja-usou'); end if;
  if c.limite is not null and c.usados >= c.limite then return jsonb_build_object('ok', false, 'motivo', 'esgotado'); end if;
  select m.account_id into conta from public.members m where m.user_id = alvo and m.papel = 'dono' limit 1;
  if conta is null then return jsonb_build_object('ok', false, 'motivo', 'sem-conta'); end if;
  select * into sub from public.subscriptions where account_id = conta;
  if found and sub.provedor <> 'cortesia' and sub.status <> 'cancelada' and sub.pago_ate >= current_date then
    return jsonb_build_object('ok', false, 'motivo', 'ja-assina');
  end if;
  -- cortesia que ainda vale é estendida; senão conta de hoje
  fim := greatest(current_date, coalesce(case when sub.provedor = 'cortesia' then sub.pago_ate end, current_date)) + c.dias;
  insert into public.subscriptions (account_id, plano, status, pago_ate, ciclo, provedor, trabalhadores)
    values (conta, 'individual', 'ativa', fim, 'mensal', 'cortesia', 1)
    on conflict (account_id) do update
      set plano = 'individual', status = 'ativa', pago_ate = excluded.pago_ate, ciclo = 'mensal', provedor = 'cortesia', atualizado_em = now();
  insert into public.beta_redemptions (user_id, codigo) values (alvo, c.codigo);
  update public.beta_invites set usados = usados + 1 where codigo = c.codigo;
  return jsonb_build_object('ok', true, 'pagoAte', fim, 'dias', c.dias);
end $$;
revoke execute on function public.resgatar_convite(uuid, text) from public, anon, authenticated;
grant execute on function public.resgatar_convite(uuid, text) to service_role;

-- a limpeza também tira opiniões ocultas com mais de 1 ano
create or replace function public.limpar_historico() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.audit_log where em < now() - interval '90 days';
  delete from public.client_errors where em < now() - interval '30 days';
  delete from public.notification_log where dia < (now() at time zone 'America/Sao_Paulo')::date - 60;
  update public.support_requests set registros = null, registros_expira = null where registros_expira < now();
  delete from public.app_events where em < now() - interval '365 days';
  delete from public.feedback where status = 'oculto' and criado_em < now() - interval '365 days';
end $$;
revoke execute on function public.limpar_historico() from public, anon, authenticated;
