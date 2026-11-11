import { describe, expect, it } from "vitest";
import { LIMITE_PRODUCAO_GRATIS, lerCpfCnpj, pagoAteDoPagamento, PLANOS, pode, situacaoDoPlano, valorMensal } from "../src/planos";

const inicioUso = "2026-11-01";

describe("teste grátis", () => {
  it("14 dias de Individual a partir do primeiro uso, com aviso no fim", () => {
    expect(situacaoDoPlano({ assinatura: null, inicioUso, hoje: "2026-11-01" })).toEqual({ plano: "individual", emTeste: true, diasDeTeste: 14 });
    const fim = situacaoDoPlano({ assinatura: null, inicioUso, hoje: "2026-11-13" });
    expect(fim.diasDeTeste).toBe(2);
    expect(fim.aviso).toBe("Seu teste grátis acaba em 2 dias.");
    expect(situacaoDoPlano({ assinatura: null, inicioUso, hoje: "2026-11-14" }).aviso).toBe("Seu teste grátis acaba amanhã.");
    expect(situacaoDoPlano({ assinatura: null, inicioUso, hoje: "2026-11-15" })).toEqual({ plano: "gratis", emTeste: false, diasDeTeste: 0 });
  });
});

describe("assinatura", () => {
  const a = { plano: "individual" as const, status: "ativa" as const, pagoAte: "2026-12-10" };
  it("em dia vale o plano; atrasada tem 5 dias de tolerância", () => {
    expect(situacaoDoPlano({ assinatura: a, inicioUso, hoje: "2026-12-10" }).plano).toBe("individual");
    const atrasada = situacaoDoPlano({ assinatura: { ...a, status: "atrasada" }, inicioUso, hoje: "2026-12-14" });
    expect(atrasada.plano).toBe("individual");
    expect(atrasada.aviso).toContain("atrasado");
    expect(situacaoDoPlano({ assinatura: { ...a, status: "atrasada" }, inicioUso, hoje: "2026-12-16" }).plano).toBe("gratis");
    // ativa mas vencida (renovação não chegou): mesma tolerância
    expect(situacaoDoPlano({ assinatura: a, inicioUso, hoje: "2026-12-12" }).aviso).toContain("atrasado");
  });
  it("cancelada vale até o último dia pago e não volta para o teste", () => {
    const c = { ...a, status: "cancelada" as const };
    expect(situacaoDoPlano({ assinatura: c, inicioUso, hoje: "2026-12-01" }).aviso).toBe("Sua assinatura foi cancelada e vale até 10/12.");
    expect(situacaoDoPlano({ assinatura: c, inicioUso: "2026-12-05", hoje: "2026-12-11" }).plano).toBe("gratis");
  });
});

describe("recursos e preço", () => {
  it("o que cada plano libera", () => {
    expect(pode("gratis", "historico")).toBe(false);
    expect(pode("individual", "pdf")).toBe(true);
    expect(pode("individual", "equipe")).toBe(false);
    expect(pode("equipe", "equipe")).toBe(true);
    expect(PLANOS.gratis.resumo[2]).toContain(String(LIMITE_PRODUCAO_GRATIS));
  });
  it("Equipe cobra por trabalhador", () => {
    expect(valorMensal("individual")).toBe(1490);
    expect(valorMensal("equipe", 5)).toBe(4950);
    expect(valorMensal("equipe", 0)).toBe(990);
  });
});

describe("cobrança", () => {
  it("mensalidade cobre até a véspera do mesmo dia no mês seguinte", () => {
    expect(pagoAteDoPagamento("2026-11-11")).toBe("2026-12-10");
    expect(pagoAteDoPagamento("2026-12-20")).toBe("2027-01-19");
    expect(pagoAteDoPagamento("2027-01-31")).toBe("2027-02-27");
  });

  it("valida CPF e CNPJ", () => {
    expect(lerCpfCnpj("529.982.247-25")).toBe("52998224725");
    expect(lerCpfCnpj("529.982.247-24")).toBeNull();
    expect(lerCpfCnpj("111.111.111-11")).toBeNull();
    expect(lerCpfCnpj("11.222.333/0001-81")).toBe("11222333000181");
    expect(lerCpfCnpj("11.222.333/0001-80")).toBeNull();
    expect(lerCpfCnpj("123")).toBeNull();
  });
});
