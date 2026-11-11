-- Pingou: banco na nuvem (Supabase/Postgres).
-- Cada pessoa só vê e altera os próprios dados (RLS em todas as tabelas).
-- Sincronização "último a editar vence": o banco ignora uma gravação mais antiga
-- que a que já está salva, e guarda a versão anterior no histórico (audit_log).


-- ---------- contas e membros ----------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'individual' check (tipo in ('individual', 'equipe')),
  nome text,
  criado_em timestamptz not null default now()
);

create table public.members (
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null check (papel in ('dono', 'gestor', 'trabalhador')),
  criado_em timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index members_user on public.members (user_id);

-- conta individual criada junto com o usuário
create or replace function public.criar_conta_do_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare nova uuid;
begin
  insert into public.accounts (tipo) values ('individual') returning id into nova;
  insert into public.members (account_id, user_id, papel) values (nova, new.id, 'dono');
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_conta_do_usuario();

-- ---------- dados sincronizados ----------
-- Uma tabela por tipo de dado do app. "dados" guarda o objeto validado pelo app
-- (packages/core/schema); o servidor recalcula com o mesmo motor quando precisa.

create table public.work_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  dados jsonb not null,
  versao int not null default 1,
  atualizado_em timestamptz not null,
  apagado boolean not null default false
);

create table public.day_entries (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  chave date not null,
  dados jsonb not null,
  atualizado_em timestamptz not null,
  apagado boolean not null default false,
  primary key (user_id, chave)
);

create table public.production_items (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  chave text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null,
  apagado boolean not null default false,
  primary key (user_id, chave)
);

create table public.production_entries (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  chave text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null,
  apagado boolean not null default false,
  primary key (user_id, chave)
);

-- obras, feriados da cidade, dados do contracheque, conferências, consentimento...
create table public.settings (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  chave text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null,
  apagado boolean not null default false,
  primary key (user_id, chave)
);

create index day_entries_sync on public.day_entries (user_id, atualizado_em);
create index production_items_sync on public.production_items (user_id, atualizado_em);
create index production_entries_sync on public.production_entries (user_id, atualizado_em);
create index settings_sync on public.settings (user_id, atualizado_em);

-- ---------- assinatura (só o servidor escreve: webhook da cobrança) ----------

create table public.subscriptions (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  plano text not null check (plano in ('individual', 'equipe')),
  status text not null check (status in ('ativa', 'atrasada', 'cancelada')),
  pago_ate date not null,
  trabalhadores int not null default 1 check (trabalhadores >= 1),
  provedor text not null default 'asaas',
  provedor_cliente text,
  provedor_assinatura text unique,
  atualizado_em timestamptz not null default now()
);

-- ---------- histórico de versões ----------

create table public.audit_log (
  id bigserial primary key,
  user_id uuid not null,
  tabela text not null,
  chave text not null,
  antes jsonb,
  em timestamptz not null default now()
);
create index audit_log_user on public.audit_log (user_id, em desc);

-- último a editar vence + histórico
create or replace function public.manter_mais_recente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.atualizado_em < old.atualizado_em then
    return null; -- gravação mais antiga que a salva: ignora
  end if;
  insert into public.audit_log (user_id, tabela, chave, antes)
    values (old.user_id, tg_table_name, coalesce(to_jsonb(old) ->> 'chave', old.user_id::text), old.dados);
  return new;
end $$;

create trigger ultimo_vence before update on public.work_profiles for each row execute function public.manter_mais_recente();
create trigger ultimo_vence before update on public.day_entries for each row execute function public.manter_mais_recente();
create trigger ultimo_vence before update on public.production_items for each row execute function public.manter_mais_recente();
create trigger ultimo_vence before update on public.production_entries for each row execute function public.manter_mais_recente();
create trigger ultimo_vence before update on public.settings for each row execute function public.manter_mais_recente();

-- ---------- segurança: RLS em todas as tabelas ----------

alter table public.accounts enable row level security;
alter table public.members enable row level security;
alter table public.work_profiles enable row level security;
alter table public.day_entries enable row level security;
alter table public.production_items enable row level security;
alter table public.production_entries enable row level security;
alter table public.settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.minhas_contas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select account_id from public.members where user_id = auth.uid()
$$;

create policy "vejo minhas contas" on public.accounts for select to authenticated using (id in (select public.minhas_contas()));
create policy "vejo membros das minhas contas" on public.members for select to authenticated using (account_id in (select public.minhas_contas()));
create policy "vejo a assinatura das minhas contas" on public.subscriptions for select to authenticated using (account_id in (select public.minhas_contas()));
create policy "vejo meu histórico" on public.audit_log for select to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['work_profiles', 'day_entries', 'production_items', 'production_entries', 'settings'] loop
    execute format('create policy "meus dados: ler" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "meus dados: criar" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "meus dados: alterar" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "meus dados: apagar" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

grant select on public.accounts, public.members, public.subscriptions, public.audit_log to authenticated;
grant select, insert, update, delete on public.work_profiles, public.day_entries, public.production_items, public.production_entries, public.settings to authenticated;
grant execute on function public.minhas_contas() to authenticated;

-- LGPD: a pessoa apaga tudo o que é dela (a conta de login é removida pelo servidor)
create or replace function public.apagar_meus_dados() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.work_profiles where user_id = auth.uid();
  delete from public.day_entries where user_id = auth.uid();
  delete from public.production_items where user_id = auth.uid();
  delete from public.production_entries where user_id = auth.uid();
  delete from public.settings where user_id = auth.uid();
  delete from public.audit_log where user_id = auth.uid();
end $$;
grant execute on function public.apagar_meus_dados() to authenticated;
