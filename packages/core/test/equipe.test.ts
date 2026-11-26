import { describe, expect, it } from "vitest";
import { calcularPeriodo } from "../src/calculo/periodo";
import { valorDoLancamento } from "../src/dinheiro";
import { dividirEquipe, EQUIPE_PADRAO, resumoEquipe, totaisPorArea } from "../src/producao";
import { perfilJose } from "./ajuda";

describe("serviço dividido com a equipe", () => {
  it("laje de R$ 2.500 com 2 ajudantes, 1 meio oficial e 1 profissional", () => {
    const d = dividirEquipe(250000, EQUIPE_PADRAO, "Meio oficial");
    const cada = Object.fromEntries(d.linhas.map((l) => [l.funcao, l.cada]));
    expect(cada).toEqual({ Profissional: 85000, "Meio oficial": 65000, Ajudante: 50000 });
    expect(d.linhas.find((l) => l.funcao === "Ajudante")!.parte).toBeCloseTo(0.2);
    expect(d.minhaParte).toBe(65000);
    expect(d.pessoas).toBe(4);
    expect(d.sobra).toBe(0);
  });

  it("os três serviços somam a mesma parte que o valor total", () => {
    const servicos = [77500, 125000, 25000];
    const parte = dividirEquipe(1, EQUIPE_PADRAO, "Profissional").parte;
    const soma = servicos.reduce((t, v) => t + valorDoLancamento({ quantidade: 1, precoUnitario: v, divisao: { parte } }), 0);
    expect(soma).toBe(dividirEquipe(227500, EQUIPE_PADRAO, "Profissional").minhaParte);
  });

  it("por igual e arredondamento", () => {
    const d = dividirEquipe(100000, [{ funcao: "Ajudante", quantidade: 3, peso: 1 }], "Ajudante", true);
    expect(d.minhaParte).toBe(33333);
    expect(d.sobra).toBe(1);
  });

  it("função fora da equipe não recebe e funções com 0 pessoas saem", () => {
    const d = dividirEquipe(100000, [...EQUIPE_PADRAO.slice(0, 2), { funcao: "Ajudante", quantidade: 0, peso: 1 }], "Ajudante");
    expect(d.parte).toBe(0);
    expect(d.linhas.map((l) => l.funcao)).toEqual(["Profissional", "Meio oficial"]);
  });

  it("resumo da equipe em palavras", () => {
    expect(resumoEquipe(EQUIPE_PADRAO)).toBe("1 profissional, 1 meio oficial e 2 ajudantes");
    expect(resumoEquipe([{ funcao: "Meio oficial", quantidade: 2, peso: 1.3 }, { funcao: "Profissional", quantidade: 3, peso: 1.7 }])).toBe("2 meio oficiais e 3 profissionais");
  });

  it("só a parte da pessoa entra nos ganhos e nos totais por área", () => {
    const divisao = { parte: 0.26, minhaFuncao: "Meio oficial", equipe: EQUIPE_PADRAO, grupo: "Laje" };
    const lancamentos = [{ id: "l1", data: "2026-11-10", itemId: "laje", quantidade: 1, precoUnitario: 250000, divisao }];
    const itens = [{ id: "laje", nome: "Laje", area: "Equipe", unidade: "verba", preco: 250000, exemplo: false }];
    expect(totaisPorArea(itens, lancamentos)[0]!.valor).toBe(65000);
    const r = calcularPeriodo({ perfil: perfilJose({ pagamento: { forma: "producao" } }), periodo: { inicio: "2026-11-10", fim: "2026-11-10" }, lancamentos, itens, modo: "dia" });
    expect(r.bruto).toBe(65000);
  });
});
