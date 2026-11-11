import { afterEach, describe, expect, it, vi } from "vitest";
import { Asaas, lerReferencia, referencia } from "../lib/cobranca/asaas";

type Chamada = { url: string; method: string; body?: Record<string, unknown>; headers: Record<string, string> };

function fetchFalso(respostas: Record<string, unknown>) {
  const chamadas: Chamada[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    chamadas.push({ url, method, headers: init.headers as Record<string, string>, ...(init.body ? { body: JSON.parse(init.body as string) } : {}) });
    const chave = `${method} ${url.replace("https://api.teste/v3", "")}`;
    const r = respostas[chave];
    if (r === undefined) return new Response(JSON.stringify({ errors: [{ description: "não encontrado" }] }), { status: 404 });
    return new Response(JSON.stringify(r), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, chamadas };
}

const pedido = { conta: "conta-1", plano: "equipe" as const, trabalhadores: 4, nome: "Ana Souza", cpfCnpj: "52998224725", email: "ana@exemplo.com", vencimento: "2026-11-11" };

describe("Asaas", () => {
  it("cria cliente e assinatura mensal e devolve o link de pagamento", async () => {
    const { f, chamadas } = fetchFalso({
      "POST /customers": { id: "cus_1" },
      "POST /subscriptions": { id: "sub_1" },
      "GET /subscriptions/sub_1/payments": { data: [{ invoiceUrl: "https://pagar/abc" }] },
    });
    const r = await new Asaas("chave", "https://api.teste/v3", f).assinar(pedido);
    expect(r).toEqual({ link: "https://pagar/abc", provedorCliente: "cus_1", provedorAssinatura: "sub_1" });
    expect(chamadas[0]!.headers.access_token).toBe("chave");
    expect(chamadas[1]!.body).toMatchObject({ customer: "cus_1", cycle: "MONTHLY", billingType: "UNDEFINED", value: 39.6, nextDueDate: "2026-11-11", externalReference: "conta-1|equipe|4" });
  });

  it("mostra o erro do Asaas", async () => {
    const { f } = fetchFalso({});
    await expect(new Asaas("chave", "https://api.teste/v3", f).assinar(pedido)).rejects.toThrow("não encontrado");
  });

  const assinatura = { "GET /subscriptions/sub_1": { id: "sub_1", customer: "cus_1", externalReference: "conta-1|individual|1" } };

  it("pagamento confirmado ativa o plano por um mês", async () => {
    const { f } = fetchFalso(assinatura);
    const r = await new Asaas("chave", "https://api.teste/v3", f).interpretarAviso({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1", subscription: "sub_1", dueDate: "2026-11-11" } });
    expect(r).toEqual({ conta: "conta-1", provedorCliente: "cus_1", provedorAssinatura: "sub_1", assinatura: { plano: "individual", status: "ativa", pagoAte: "2026-12-10", trabalhadores: 1 } });
  });

  it("pagamento vencido marca atraso", async () => {
    const { f } = fetchFalso(assinatura);
    const r = await new Asaas("chave", "https://api.teste/v3", f).interpretarAviso({ event: "PAYMENT_OVERDUE", payment: { id: "pay_2", subscription: "sub_1", dueDate: "2026-12-11" } });
    expect(r?.assinatura).toMatchObject({ status: "atrasada", pagoAte: "2026-12-10" });
  });

  it("assinatura cancelada mantém o que já foi pago", async () => {
    const { f } = fetchFalso({});
    const r = await new Asaas("chave", "https://api.teste/v3", f).interpretarAviso({ event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_1", externalReference: "conta-1|individual|1" } });
    expect(r?.assinatura).toMatchObject({ status: "cancelada", pagoAte: "" });
  });

  it("ignora avisos sem relação com assinatura", async () => {
    const { f } = fetchFalso({});
    const a = new Asaas("chave", "https://api.teste/v3", f);
    expect(await a.interpretarAviso({ event: "PAYMENT_CREATED", payment: { id: "p" } })).toBeNull();
    expect(await a.interpretarAviso({ event: "PAYMENT_RECEIVED", payment: { id: "p" } })).toBeNull();
    expect(await a.interpretarAviso(null)).toBeNull();
  });

  it("referência ida e volta", () => {
    expect(lerReferencia(referencia({ conta: "c", plano: "equipe", trabalhadores: 3 }))).toEqual({ conta: "c", plano: "equipe", trabalhadores: 3 });
    expect(lerReferencia("c|ouro|1")).toBeNull();
    expect(lerReferencia(42)).toBeNull();
  });
});

describe("webhook", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sem configuração responde 503; token errado responde 401", async () => {
    const { POST } = await import("../app/api/webhooks/asaas/route");
    const pedir = (token?: string) => new Request("http://x/api/webhooks/asaas", { method: "POST", body: "{}", headers: token ? { "asaas-access-token": token } : {} });
    expect((await POST(pedir("a"))).status).toBe(503);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo-certo");
    vi.stubEnv("ASAAS_API_KEY", "chave");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemplo.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "servico");
    expect((await POST(pedir("segredo-errado"))).status).toBe(401);
    expect((await POST(pedir())).status).toBe(401);
  });

  it("assinar sem cobrança configurada responde 503", async () => {
    const { POST } = await import("../app/api/assinatura/route");
    expect((await POST(new Request("http://x/api/assinatura", { method: "POST", body: "{}" }))).status).toBe(503);
  });
});
