import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// cliente do servidor falso: o token "tk-admin" é do admin, "tk-outro" de outra pessoa
const estado: { sb: unknown } = { sb: null };
vi.mock("../lib/cobranca/servidor", () => ({ supabaseServidor: () => estado.sb }));

function sbFalso(extra: Record<string, unknown> = {}) {
  const inseridos: { tabela: string; linha: unknown }[] = [];
  const sb = {
    auth: {
      getUser: async (t: string) =>
        t === "tk-admin" ? { data: { user: { id: "u-admin", email: "Dono@Pingou.app" } }, error: null } : t === "tk-outro" ? { data: { user: { id: "u2", email: "ana@exemplo.com" } }, error: null } : { data: { user: null }, error: new Error("inválido") },
    },
    rpc: async (nome: string) => ({ data: nome === "admin_saude" ? { erros: [], notificacoes: [], agendador: [] } : null, error: null }),
    from: (tabela: string) => ({
      insert: async (linha: unknown) => {
        inseridos.push({ tabela, linha });
        return { error: null };
      },
    }),
    ...extra,
  };
  return { sb: sb as unknown as SupabaseClient, inseridos };
}

const pedido = (token?: string) => new Request("https://pingou.test/api/admin/saude", { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe("acesso ao painel", () => {
  beforeEach(() => vi.stubEnv("ADMIN_EMAILS", " dono@pingou.app , outra@pingou.app"));
  afterEach(() => {
    vi.unstubAllEnvs();
    estado.sb = null;
  });

  it("lê a lista de e-mails sem espaços e em minúsculas", async () => {
    const { emailsAdmin } = await import("../lib/admin");
    expect(emailsAdmin()).toEqual(["dono@pingou.app", "outra@pingou.app"]);
  });

  it("sem banco configurado responde 503", async () => {
    const { GET } = await import("../app/api/admin/saude/route");
    expect((await GET(pedido("tk-admin"))).status).toBe(503);
  });

  it("sem token ou com token inválido responde 401", async () => {
    estado.sb = sbFalso().sb;
    const { GET } = await import("../app/api/admin/saude/route");
    expect((await GET(pedido())).status).toBe(401);
    expect((await GET(pedido("lixo"))).status).toBe(401);
  });

  it("conta fora da lista responde 403, mesmo logada", async () => {
    estado.sb = sbFalso().sb;
    const { GET } = await import("../app/api/admin/saude/route");
    const r = await GET(pedido("tk-outro"));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: "Esta conta não tem acesso ao painel." });
  });

  it("admin (e-mail em maiúsculas no login) entra", async () => {
    estado.sb = sbFalso().sb;
    const { GET } = await import("../app/api/admin/saude/route");
    const r = await GET(pedido("tk-admin"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ erros: [], notificacoes: [], agendador: [] });
  });

  it("lista vazia não libera ninguém", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    estado.sb = sbFalso().sb;
    const { GET } = await import("../app/api/admin/eu/route");
    expect((await GET(pedido("tk-admin"))).status).toBe(403);
  });

  it("apagar conta exige digitar o e-mail certo", async () => {
    const apagados: string[] = [];
    const cadeia = { select: () => cadeia, eq: () => cadeia, maybeSingle: async () => ({ data: { account_id: "c1" } }), delete: () => cadeia };
    const base = sbFalso().sb as unknown as { auth: Record<string, unknown> };
    estado.sb = {
      ...base,
      from: () => cadeia,
      auth: {
        ...base.auth,
        admin: {
          getUserById: async () => ({ data: { user: { id: "alvo", email: "ana@exemplo.com" } } }),
          deleteUser: async (id: string) => {
            apagados.push(id);
            return { error: null };
          },
        },
      },
    };
    const { POST } = await import("../app/api/admin/pessoa/route");
    const r = await POST(
      new Request("https://pingou.test/api/admin/pessoa", {
        method: "POST",
        headers: { Authorization: "Bearer tk-admin", "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "apagar", id: "6f1c1d3a-3b1e-4c55-9d7e-1a2b3c4d5e6f", confirmacao: "outra@exemplo.com" }),
      }),
    );
    expect(r.status).toBe(400);
    expect(apagados).toEqual([]);
  });
});

describe("receita do mês", () => {
  it("soma mensal + anual ÷ 12 e ignora cortesia, cancelada e vencida", async () => {
    const { receitaMensal } = await import("../lib/admin-numeros");
    const hoje = "2026-11-17";
    const base = { trabalhadores: 1, status: "ativa", pago_ate: "2026-12-01" };
    const v = receitaMensal(
      [
        { ...base, plano: "individual", ciclo: "mensal", provedor: "asaas" },
        { ...base, plano: "individual", ciclo: "anual", provedor: "asaas" },
        { ...base, plano: "individual", ciclo: "mensal", provedor: "cortesia" },
        { ...base, plano: "individual", ciclo: "mensal", provedor: "asaas", status: "cancelada" },
        { ...base, plano: "individual", ciclo: "mensal", provedor: "asaas", pago_ate: "2026-11-01" },
      ],
      hoje,
    );
    expect(v).toBe(1490 + Math.round(11900 / 12));
  });
});

describe("beta e opinião sem banco", () => {
  it("convite sem banco não vale e resgatar responde 503", async () => {
    const { GET } = await import("../app/api/beta/route");
    expect(await (await GET(new Request("http://x/api/beta?codigo=OBRA-SP"))).json()).toEqual({ valido: false });
    const { POST } = await import("../app/api/beta/resgatar/route");
    expect((await POST(new Request("http://x/api/beta/resgatar", { method: "POST", body: "{}" }))).status).toBe(503);
  });

  it("opinião sem banco responde 503", async () => {
    const { POST } = await import("../app/api/opiniao/route");
    expect((await POST(new Request("http://x/api/opiniao", { method: "POST", body: JSON.stringify({ nota: 9 }) }))).status).toBe(503);
  });

  it("código do convite sai do nome, sem acento e em maiúsculas", async () => {
    const { codigoDoNome } = await import("../lib/beta");
    expect(codigoDoNome("Obra da Vila Mariana – São Paulo")).toBe("OBRA-DA-VILA-MARIANA-SAO-PAULO");
    expect(codigoDoNome("  ação!  ")).toBe("ACAO");
  });
});
