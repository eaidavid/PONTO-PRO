import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Roda a migração de verdade num Postgres (PGlite) com um "auth" mínimo igual ao do Supabase
 * e confere as regras de segurança (RLS) e o "último a editar vence".
 */
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
let db: PGlite;

async function como<T>(usuario: string, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [usuario]);
  await db.exec("set role authenticated");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create role authenticated nologin;
    create role anon nologin;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  await db.exec(readFileSync(join(__dirname, "../../../supabase/migrations/0001_inicial.sql"), "utf8"));
  await db.query("insert into auth.users (id) values ($1), ($2)", [A, B]);
});

describe("migração do banco", () => {
  it("cria uma conta individual com a pessoa como dona", async () => {
    const contas = await como(A, () => db.query<{ tipo: string }>("select tipo from accounts"));
    expect(contas.rows).toEqual([{ tipo: "individual" }]);
    const papeis = await como(A, () => db.query<{ papel: string }>("select papel from members"));
    expect(papeis.rows).toEqual([{ papel: "dono" }]);
  });

  it("cada pessoa só vê e altera os próprios registros", async () => {
    await como(A, () =>
      db.query("insert into day_entries (chave, dados, atualizado_em) values ('2026-11-09', $1, '2026-11-09T10:00:00Z')", [JSON.stringify({ tipo: "normal" })]),
    );
    const deA = await como(A, () => db.query("select chave from day_entries"));
    const deB = await como(B, () => db.query("select chave from day_entries"));
    expect(deA.rows).toHaveLength(1);
    expect(deB.rows).toHaveLength(0);
    // B não consegue gravar em nome de A
    await expect(
      como(B, () => db.query("insert into day_entries (user_id, chave, dados, atualizado_em) values ($1, '2026-11-10', '{}', now())", [A])),
    ).rejects.toThrow(/row-level security/);
    // nem apagar o que é de A
    await como(B, () => db.query("delete from day_entries"));
    expect((await como(A, () => db.query("select chave from day_entries"))).rows).toHaveLength(1);
  });

  it("último a editar vence e a versão anterior vai para o histórico", async () => {
    const gravar = (quando: string, obs: string) =>
      como(A, () =>
        db.query(
          `insert into day_entries (chave, dados, atualizado_em) values ('2026-11-11', $1, $2)
           on conflict (user_id, chave) do update set dados = excluded.dados, atualizado_em = excluded.atualizado_em`,
          [JSON.stringify({ observacao: obs }), quando],
        ),
      );
    await gravar("2026-11-11T10:00:00Z", "primeira");
    await gravar("2026-11-11T12:00:00Z", "mais nova");
    await gravar("2026-11-11T11:00:00Z", "atrasada (celular estava sem internet)");
    const atual = await como(A, () => db.query<{ dados: { observacao: string } }>("select dados from day_entries where chave = '2026-11-11'"));
    expect(atual.rows[0]!.dados.observacao).toBe("mais nova");
    const hist = await como(A, () => db.query<{ antes: { observacao: string } }>("select antes from audit_log where chave = '2026-11-11' order by id"));
    expect(hist.rows.map((h) => h.antes.observacao)).toEqual(["primeira"]);
  });

  it("ninguém se dá assinatura paga pelo app", async () => {
    await expect(
      como(A, () => db.query("insert into subscriptions (account_id, plano, status, pago_ate) select id, 'individual', 'ativa', '2099-01-01' from accounts")),
    ).rejects.toThrow(/permission denied|row-level security/);
  });

  it("apagar meus dados remove só os meus", async () => {
    await como(B, () => db.query("insert into settings (chave, dados, atualizado_em) values ('pessoal', '{}', now())"));
    await como(A, () => db.query("select apagar_meus_dados()"));
    expect((await como(A, () => db.query("select 1 from day_entries"))).rows).toHaveLength(0);
    expect((await como(B, () => db.query("select 1 from settings"))).rows).toHaveLength(1);
  });
});
