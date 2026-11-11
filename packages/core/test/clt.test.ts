import { describe, expect, it } from "vitest";
import { calcularPeriodo } from "../src/calculo/periodo";
import { calcularInss, calcularIrrf, descontoValeTransporte, dsrSobreExtras, tabelaDoAno } from "../src/clt";
import { PerfilTrabalho } from "../src/schema/perfil";
import { dia, perfilJose, SEMANA, semanaJose } from "./ajuda";

describe("INSS 2026 por faixas (Portaria MPS/MF nº 13/2026)", () => {
  it("cada faixa paga só a sua parte", () => {
    expect(calcularInss(162_100, 2026).valor).toBe(12_158); // 1.621,00 × 7,5%
    // 121,575 + 1.281,84 × 9% + 97,16 × 12% = 248,60
    expect(calcularInss(300_000, 2026).valor).toBe(24_860);
    expect(calcularInss(500_000, 2026).valor).toBe(50_151);
    expect(calcularInss(300_000, 2026).passos).toHaveLength(3);
  });
  it("respeita o teto de R$ 8.475,55 (desconto máximo R$ 988,09)", () => {
    const r = calcularInss(1_500_000, 2026);
    expect(r.valor).toBe(98_809);
    expect(r.noTeto).toBe(true);
    expect(calcularInss(0, 2026).valor).toBe(0);
  });
  it("usa a tabela mais recente até o ano pedido", () => {
    expect(tabelaDoAno(2027).ano).toBe(2026);
    expect(tabelaDoAno(2020).ano).toBe(2026);
  });
});

describe("IRRF 2026 com a redução da Lei 15.270/2025", () => {
  it("isento na primeira faixa", () => {
    expect(calcularIrrf(240_000, calcularInss(240_000, 2026).valor, 0, 2026).valor).toBe(0);
  });
  it("até R$ 5.000 o imposto é zerado pela redução", () => {
    const r = calcularIrrf(500_000, 50_151, 0, 2026);
    expect(r.modo).toBe("simplificado"); // 4.392,80 dá menos que 4.498,49
    expect(r.impostoTabela).toBe(31_289);
    expect(r.reducao).toBe(31_289);
    expect(r.valor).toBe(0);
  });
  it("entre R$ 5.000 e R$ 7.350 a redução diminui", () => {
    const inss = calcularInss(600_000, 2026).valor; // 641,51
    expect(inss).toBe(64_151);
    const r = calcularIrrf(600_000, inss, 0, 2026);
    expect(r.modo).toBe("deducoes");
    expect(r.impostoTabela).toBe(56_485); // 5.358,49 × 27,5% − 908,73
    expect(r.reducao).toBe(17_975); // 978,62 − 0,133145 × 6.000
    expect(r.valor).toBe(38_510);
  });
  it("acima de R$ 7.350 não há redução; dependentes diminuem a base", () => {
    const inss = calcularInss(1_000_000, 2026).valor;
    const sem = calcularIrrf(1_000_000, inss, 0, 2026);
    const com = calcularIrrf(1_000_000, inss, 2, 2026);
    expect(sem.reducao).toBe(0);
    // cada imposto é arredondado sozinho: a diferença pode variar 1 centavo
    expect(Math.abs(sem.valor - com.valor - 2 * 18_959 * 0.275)).toBeLessThanOrEqual(1);
  });
});

describe("DSR sobre hora extra e vale-transporte", () => {
  it("contas simples", () => {
    expect(dsrSobreExtras(18_750, 25, 6)).toBe(4_500);
    expect(dsrSobreExtras(0, 25, 6)).toBe(0);
    expect(dsrSobreExtras(100, 0, 6)).toBe(0);
    expect(descontoValeTransporte(200_000, 6)).toBe(12_000);
    expect(descontoValeTransporte(200_000, 6, 8_000)).toBe(8_000);
  });
});

describe("folha CLT no cálculo do período", () => {
  it("salário mensal com INSS, IR e vale-transporte", () => {
    const perfil = perfilJose({
      pagamento: { forma: "mensal", salario: 300_000, divisorHoras: 220 },
      descontos: [
        { id: "a", nome: "INSS", tipo: "inss" },
        { id: "b", nome: "Imposto de renda", tipo: "irrf", dependentes: 0 },
        { id: "c", nome: "Vale-transporte", tipo: "vale-transporte", percentual: 6 },
      ],
    });
    const r = calcularPeriodo({ perfil, periodo: { inicio: "2026-10-21", fim: "2026-11-20" } });
    const cod = (c: string) => r.descontos.find((l) => l.codigo === c)!;
    expect(cod("120").valor).toBe(24_860);
    expect(cod("120").conta).toContain("por faixas");
    expect(cod("121").valor).toBe(0); // simplificado deixa isento
    expect(cod("121").referencia).toBe("isento");
    expect(cod("122").valor).toBe(18_000);
    expect(r.liquido).toBe(300_000 - 24_860 - 18_000);
    expect(PerfilTrabalho.safeParse(perfil).success).toBe(true);
  });

  it("IR com valor mostra a redução na conta", () => {
    const perfil = perfilJose({
      pagamento: { forma: "mensal", salario: 600_000, divisorHoras: 220 },
      descontos: [{ id: "a", nome: "INSS", tipo: "inss" }, { id: "b", nome: "IR", tipo: "irrf", dependentes: 0 }],
    });
    const r = calcularPeriodo({ perfil, periodo: { inicio: "2026-10-21", fim: "2026-11-20" } });
    const ir = r.descontos.find((l) => l.codigo === "121")!;
    expect(ir.valor).toBe(38_510);
    expect(ir.conta).toContain("redução");
    // IR sem INSS configurado não deduz INSS
    const soIr = perfilJose({ pagamento: { forma: "mensal", salario: 600_000, divisorHoras: 220 }, descontos: [{ id: "b", nome: "IR", tipo: "irrf", dependentes: 1 }] });
    expect(calcularPeriodo({ perfil: soIr, periodo: { inicio: "2026-10-21", fim: "2026-11-20" } }).descontos[0]!.valor).toBeGreaterThan(0);
  });

  it("DSR sobre a hora extra do sábado", () => {
    const perfil = perfilJose({ clt: { dsrSobreExtras: true } });
    const r = calcularPeriodo({ perfil, periodo: SEMANA, registros: [...semanaJose(), dia("2026-10-31", "07:00", undefined, undefined, "12:00")] });
    const dsr = r.ganhos.find((l) => l.codigo === "024")!;
    expect(dsr.valor).toBe(3_125); // 187,50 ÷ 6 dias úteis × 1 domingo
    expect(dsr.conta).toContain("6 dias úteis × 1 domingos e feriados");
  });

  it("vale-transporte acima de 6% é bloqueado", () => {
    const p = perfilJose({ descontos: [{ id: "c", nome: "VT", tipo: "vale-transporte", percentual: 8 }] });
    expect(PerfilTrabalho.safeParse(p).error!.issues[0]!.message).toBe("O desconto do vale-transporte é de no máximo 6%");
  });
});

describe("descrição dos descontos", () => {
  it("em palavras", async () => {
    const { descreverDesconto } = await import("../src/clt");
    expect(descreverDesconto({ tipo: "percentual", valor: 9 })).toBe("9%");
    expect(descreverDesconto({ tipo: "fixo", valor: 5000 })).toBe("R$ 50,00");
    expect(descreverDesconto({ tipo: "inss" })).toBe("tabela oficial, por faixas");
    expect(descreverDesconto({ tipo: "irrf", dependentes: 2 })).toBe("tabela oficial, 2 dependente(s)");
    expect(descreverDesconto({ tipo: "irrf", dependentes: 0 })).toBe("tabela oficial");
    expect(descreverDesconto({ tipo: "vale-transporte", percentual: 6 })).toBe("6% do salário-base");
    expect(descreverDesconto({ tipo: "outro" })).toBe("");
  });
});
