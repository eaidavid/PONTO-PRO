-- Notificações (Web Push) e registro de erros do app.

-- ---------- inscrições de notificação ----------
-- Uma linha por aparelho que aceitou receber notificações. A pessoa só vê e apaga as próprias.
create table public.push_subscriptions (
  endpoint text primary key check (char_length(endpoint) <= 1000),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  criado_em timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

create policy "minhas inscrições: ler" on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "minhas inscrições: criar" on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "minhas inscrições: alterar" on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "minhas inscrições: apagar" on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ---------- notificações já enviadas (uma de cada tipo por dia) ----------
-- Só o servidor lê e grava.
create table public.notification_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('saida', 'pagamento')),
  dia date not null,
  enviado_em timestamptz not null default now(),
  primary key (user_id, tipo, dia)
);
alter table public.notification_log enable row level security;

-- ---------- erros do app ----------
-- Gravados pela rota /api/erros com a chave de serviço. Ninguém lê pelo app.
create table public.client_errors (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete set null,
  mensagem text not null check (char_length(mensagem) <= 2000),
  pilha text check (char_length(pilha) <= 8000),
  url text check (char_length(url) <= 500),
  agente text check (char_length(agente) <= 400),
  em timestamptz not null default now()
);
create index client_errors_em on public.client_errors (em desc);
alter table public.client_errors enable row level security;

-- LGPD: apagar os dados também apaga as inscrições de notificação
create or replace function public.apagar_meus_dados() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  delete from public.work_profiles where user_id = auth.uid();
  delete from public.day_entries where user_id = auth.uid();
  delete from public.production_items where user_id = auth.uid();
  delete from public.production_entries where user_id = auth.uid();
  delete from public.settings where user_id = auth.uid();
  delete from public.audit_log where user_id = auth.uid();
  delete from public.push_subscriptions where user_id = auth.uid();
  delete from public.notification_log where user_id = auth.uid();
end $$;
