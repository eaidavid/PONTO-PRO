import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/** Roda as migrações 0001, 0002, 0003, 0006 e 0007 num Postgres de verdade (PGlite) e confere as funções do painel. */
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
let db: PGlite;
const migracao = (n: string) => readFileSync(join(__dirname, `../../../supabase/migrations/${n}`), "utf8");

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text, created_at timestamptz default now(), last_sign_in_at timestamptz);
    create role authenticated nologin;
    create role anon nologin;
    create role service_role nologin bypassrls;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create schema cron;
    create table cron.job (jobid bigint primary key, jobname text);
    create table cron.job_run_details (jobid bigint, start_time timestamptz, status text, return_message text);
  `);
  for (const m of ["0001_inicial.sql", "0002_planos.sql", "0003_notificacoes_erros.sql", "0006_painel.sql", "0007_avisos_banco.sql"]) await db.exec(migracao(m));
  await db.query("insert into auth.users (id, email, created_at, last_sign_in_at) values ($1, 'jose@gmail.com', now() - interval '20 days', now()), ($2, 'ana@hotmail.com', now() - interval '2 days', null)", [A, B]);
  await db.query("insert into settings (user_id, chave, dados, atualizado_em) values ($1, 'inicioUso', '\"2026-01-01\"', now()), ($2, 'inicioUso', to_jsonb(to_char(current_date - 2, 'YYYY-MM-DD')), now())", [A, B]);
  await db.query("insert into day_entries (user_id, chave, dados, atualizado_em) values ($1, '2026-11-09', '{}', now()), ($1, '2026-11-10', '{}', now())", [A]);
  const conta = await db.query<{ account_id: string }>("select account_id from members where user_id = $1", [A]);
  await db.query("insert into subscriptions (account_id, plano, status, pago_ate, ciclo, provedor) values ($1, 'individual', 'ativa', current_date + 20, 'mensal', 'asaas')", [conta.rows[0]!.account_id]);
});

describe("funções do painel", () => {
  it("resumo conta pessoas, ativas, teste e conversão", async () => {
    const r = await db.query<{ r: Record<string, unknown> }>("select public.admin_resumo() as r");
    const v = r.rows[0]!.r;
    expect(v.contas).toBe(2);
    expect(v.novas7).toBe(1);
    expect(v.ativas7).toBe(2);
    expect(v.testeTerminado).toBe(1);
    expect(v.testeVirouPago).toBe(1);
    expect(v.emTeste).toBe(1);
    expect((v.novasPorDia as unknown[]).length).toBe(30);
  });

  it("lista de pessoas com busca e filtros", async () => {
    const todas = await db.query<{ email: string; total: number }>("select email, total from public.admin_pessoas('', 'todas', 50, 0)");
    expect(todas.rows.map((x) => x.email)).toEqual(["ana@hotmail.com", "jose@gmail.com"]);
    const pro = await db.query<{ email: string }>("select email from public.admin_pessoas('', 'pro', 50, 0)");
    expect(pro.rows.map((x) => x.email)).toEqual(["jose@gmail.com"]);
    const teste = await db.query<{ email: string }>("select email from public.admin_pessoas('', 'teste', 50, 0)");
    expect(teste.rows.map((x) => x.email)).toEqual(["ana@hotmail.com"]);
    const busca = await db.query<{ email: string }>("select email from public.admin_pessoas('hotmail', 'todas', 50, 0)");
    expect(busca.rows).toHaveLength(1);
  });

  it("detalhe mostra contagens, não os registros", async () => {
    const r = await db.query<{ r: Record<string, unknown> }>("select public.admin_pessoa($1) as r", [A]);
    const v = r.rows[0]!.r;
    expect(v.diasRegistrados).toBe(2);
    expect(JSON.stringify(v)).not.toContain("marcacoes");
    expect((v.assinatura as { plano: string }).plano).toBe("individual");
  });

  it("funil conta aparelhos distintos por evento", async () => {
    await db.query("insert into app_events (evento, aparelho, dados) values ('clique_comecar', 'a1', '{\"secao\":\"abertura\"}'), ('clique_comecar', 'a1', '{\"secao\":\"abertura\"}'), ('clique_comecar', 'a2', '{\"secao\":\"final\",\"origem_visita\":\"indicacao\"}')");
    const r = await db.query<{ evento: string; detalhe: string; aparelhos: number }>("select evento, detalhe, aparelhos::int from public.admin_funil(now() - interval '7 days', '') order by detalhe");
    expect(r.rows).toEqual([
      { evento: "clique_comecar", detalhe: "abertura", aparelhos: 1 },
      { evento: "clique_comecar", detalhe: "final", aparelhos: 1 },
    ]);
    const ind = await db.query("select * from public.admin_funil(now() - interval '7 days', 'indicacao')");
    expect(ind.rows).toHaveLength(1);
  });

  it("saúde e limpeza rodam", async () => {
    await db.query("insert into client_errors (mensagem) values ('Failed to fetch'), ('Failed to fetch')");
    const r = await db.query<{ r: { erros: { total: number }[] } }>("select public.admin_saude() as r");
    expect(r.rows[0]!.r.erros[0]!.total).toBe(2);
    await db.query("insert into support_requests (mensagem, registros, registros_expira) values ('não bateu', '{\"x\":1}', now() - interval '1 day')");
    await db.query("select public.limpar_historico()");
    const s = await db.query<{ registros: unknown }>("select registros from support_requests");
    expect(s.rows[0]!.registros).toBeNull();
  });

  it("usuário do app não chama as funções do painel nem lê as tabelas", async () => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [A]);
    await db.exec("set role authenticated");
    try {
      await expect(db.query("select public.admin_resumo()")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.support_requests")).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("migração 0007 (avisos do banco)", () => {
  async function como<T>(papel: "authenticated" | "anon", usuario: string | null, fn: () => Promise<T>): Promise<T> {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [usuario ?? ""]);
    await db.exec(`set role ${papel}`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
    }
  }

  it("cada pessoa continua vendo só os próprios registros", async () => {
    const deA = await como("authenticated", A, () => db.query("select chave from day_entries"));
    const deB = await como("authenticated", B, () => db.query("select chave from day_entries"));
    expect(deA.rows).toHaveLength(2);
    expect(deB.rows).toHaveLength(0);
    await expect(como("authenticated", B, () => db.query("insert into day_entries (user_id, chave, dados, atualizado_em) values ($1, '2026-11-11', '{}', now())", [A]))).rejects.toThrow();
  });

  it("quem não entrou não chama apagar_meus_dados; funções de gatilho não são chamáveis", async () => {
    await expect(como("anon", null, () => db.query("select public.apagar_meus_dados()"))).rejects.toThrow(/permission denied/);
    await expect(como("authenticated", A, () => db.query("select public.manter_mais_recente()"))).rejects.toThrow();
  });

  it("metas do beta: ativação no 1º dia e uso no 7º dia", async () => {
    await db.query("insert into app_events (evento, aparelho, em) values ('comecar_concluido', 'ap1', now() - interval '3 days'), ('primeiro_ponto', 'ap1', now() - interval '3 days' + interval '2 hours'), ('comecar_concluido', 'ap2', now() - interval '3 days'), ('comecar_concluido', 'ap3', now() - interval '2 hours')");
    const r = await db.query<{ m: Record<string, number> }>("select public.admin_metas() as m");
    expect(r.rows[0]!.m).toMatchObject({ comecos: 2, ativados: 1, contas7: 1, voltaram7: 1 });
  });

  it("lista de espera aceita o Pro e continua recusando plano desconhecido", async () => {
    await db.query("insert into waitlist (plano, nome, whatsapp) values ('individual', 'Ana', '11912345678')");
    await expect(db.query("insert into waitlist (plano, nome, whatsapp) values ('ouro', 'Ana', '11912345679')")).rejects.toThrow();
  });
});
