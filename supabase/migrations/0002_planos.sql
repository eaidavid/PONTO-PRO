-- Planos novos: Pro mensal ou anual e lista de espera da Turma.

-- ---------- ciclo da assinatura ----------
alter table public.subscriptions
  add column ciclo text not null default 'mensal' check (ciclo in ('mensal', 'anual'));

-- ---------- lista de espera (planos que ainda não estão à venda) ----------
-- Só o servidor grava (rota /api/lista-espera, com a chave de serviço). Ninguém lê pelo app.
create table public.waitlist (
  id bigserial primary key,
  plano text not null check (plano in ('equipe')),
  nome text not null check (char_length(nome) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  pessoas int check (pessoas between 1 and 500),
  origem text not null default 'app' check (origem in ('app', 'site')),
  criado_em timestamptz not null default now(),
  unique (plano, whatsapp)
);
alter table public.waitlist enable row level security;
