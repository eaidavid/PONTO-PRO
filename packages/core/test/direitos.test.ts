import { describe, expect, it } from "vitest";
import { anosCompletos, decimoTerceiro, ferias, mesesDeDecimo, mesesDeFerias, rescisao, salarioLiquido, somarMeses } from "../src/direitos";

const valor = (r: { linhas: { descricao: string; valor: number }[] }, inicio: string) => r.linhas.find((l) => l.descricao.startsWith(inicio))?.valor;

describe("contagem de meses", () => {
  it("somar meses segura no fim do mês", () => {
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2026-11-16", 2)).toBe("2027-01-16");
  });
  it("13º: mês com 15 dias ou mais conta", () => {
    expect(mesesDeDecimo("2026-03-10", "2026-11-16")).toBe(9);
    expect(mesesDeDecimo("2026-03-20", "2026-12-31")).toBe(9);
    expect(mesesDeDecimo("2020-01-01", "2026-12-31")).toBe(12);
  });
  it("férias proporcionais desde o último aniversário da admissão", () => {
    expect(mesesDeFerias("2024-02-01", "2026-11-16")).toBe(10);
    expect(mesesDeFerias("2026-11-01", "2026-11-10")).toBe(0);
    expect(anosCompletos("2024-02-01", "2026-11-16")).toBe(2);
    expect(anosCompletos("2024-02-01", "2026-02-01")).toBe(2);
  });
});

describe("salário líquido", () => {
  it("desconta INSS e IR do bruto", () => {
    const r = salarioLiquido({ salario: 300_000, ano: 2026 });
    expect(r.bruto).toBe(300_000);
    expect(r.descontos).toBeGreaterThan(0);
    expect(r.liquido).toBe(r.bruto - r.descontos);
  });
});

describe("férias", () => {
  it("30 dias com 1/3", () => {
    const r = ferias({ salario: 300_000, ano: 2026 });
    expect(valor(r, "Férias (30 dias)")).toBe(300_000);
    expect(valor(r, "1/3 de férias")).toBe(100_000);
    expect(r.bruto).toBe(400_000);
  });
  it("vendendo 10 dias: 20 de férias e 10 de abono, abono sem desconto", () => {
    const r = ferias({ salario: 300_000, venderDias: true, ano: 2026 });
    expect(valor(r, "Férias (20 dias)")).toBe(200_000);
    expect(valor(r, "1/3 de férias")).toBe(66_667);
    expect(valor(r, "Venda de 10 dias")).toBe(100_000);
    expect(valor(r, "1/3 sobre a venda")).toBe(33_333);
    const semVenda = ferias({ salario: 300_000, ano: 2026 });
    // INSS só sobre férias + 1/3, então com venda o desconto é menor
    expect(r.descontos).toBeLessThan(semVenda.descontos);
  });
});

describe("13º", () => {
  it("proporcional aos meses e em duas parcelas", () => {
    const r = decimoTerceiro({ salario: 300_000, meses: 6, ano: 2026 });
    expect(r.bruto).toBe(150_000);
    expect(r.primeiraParcela).toBe(75_000);
    expect(r.primeiraParcela + r.segundaParcela).toBe(r.liquido);
  });
});

describe("rescisão", () => {
  const base = { salario: 300_000, admissao: "2024-02-01", saida: "2026-11-16" };
  it("sem justa causa, aviso indenizado: aviso de 36 dias projeta 13º e férias", () => {
    const r = rescisao({ ...base, motivo: "sem-justa-causa" });
    expect(r.diasAviso).toBe(36);
    expect(valor(r, "Saldo de salário (16 dias)")).toBe(160_000);
    expect(valor(r, "Aviso prévio indenizado (36 dias)")).toBe(360_000);
    expect(valor(r, "13º proporcional (12/12)")).toBe(300_000);
    expect(valor(r, "Férias proporcionais (11/12)")).toBe(275_000);
    expect(valor(r, "1/3 das férias proporcionais")).toBe(91_667);
    expect(r.fgts.multa).toBe(Math.round(r.fgts.saldo * 0.4));
    expect(r.fgts.saque).toBe(r.fgts.saldo + r.fgts.multa);
  });
  it("acordo: metade do aviso e 20% de multa", () => {
    const r = rescisao({ ...base, motivo: "acordo" });
    expect(r.diasAviso).toBe(18);
    expect(r.fgts.multa).toBe(Math.round(r.fgts.saldo * 0.2));
  });
  it("pedido sem cumprir o aviso desconta 30 dias", () => {
    const r = rescisao({ ...base, motivo: "pedido", avisoTrabalhado: false });
    expect(r.diasAviso).toBe(0);
    expect(valor(r, "Desconto do aviso não cumprido")).toBe(300_000);
    expect(r.fgts.saque).toBe(0);
  });
  it("justa causa: só saldo e férias vencidas", () => {
    const r = rescisao({ ...base, motivo: "justa-causa", feriasVencidas: 1 });
    expect(valor(r, "13º proporcional")).toBeUndefined();
    expect(valor(r, "Férias proporcionais")).toBeUndefined();
    expect(valor(r, "Férias vencidas")).toBe(300_000);
    expect(r.fgts.multa).toBe(0);
  });
  it("saldo do FGTS informado substitui a estimativa", () => {
    const r = rescisao({ ...base, motivo: "sem-justa-causa", saldoFgts: 500_000 });
    expect(r.fgts.multa).toBe(200_000);
  });
});
