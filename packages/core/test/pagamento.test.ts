import { describe, expect, it } from "vitest";
import { dataDePagamento, quandoFalta } from "../src/pagamento";
import { perfilJose } from "./ajuda";

const periodo = { inicio: "2026-10-21", fim: "2026-11-20" };

describe("dia do pagamento", () => {
  it("quinto dia útil do mês seguinte (segunda a sábado, sem feriado)", () => {
    // dezembro/2026: 01 ter, 02 qua, 03 qui, 04 sex, 05 sáb → 05/12
    expect(dataDePagamento(perfilJose(), periodo)).toBe("2026-12-05");
    // novembro/2026 (período que fecha em 20/10): 02 é Finados → 03,04,05,06,07 → 07/11
    expect(dataDePagamento(perfilJose(), { inicio: "2026-09-21", fim: "2026-10-20" })).toBe("2026-11-07");
    // feriado local entra na conta
    expect(dataDePagamento(perfilJose(), periodo, [{ data: "2026-12-03", nome: "X", tipo: "local" }])).toBe("2026-12-07");
    // fechamento em dezembro paga em janeiro do ano seguinte (01/01 é feriado)
    expect(dataDePagamento(perfilJose(), { inicio: "2026-11-21", fim: "2026-12-20" })).toBe("2027-01-07");
  });

  it("dia fixo e no fechamento", () => {
    expect(dataDePagamento(perfilJose({ diaPagamento: { tipo: "dia-fixo", dia: 30 } }), periodo)).toBe("2026-11-30");
    expect(dataDePagamento(perfilJose({ diaPagamento: { tipo: "dia-fixo", dia: 10 } }), periodo)).toBe("2026-12-10");
    expect(dataDePagamento(perfilJose({ diaPagamento: { tipo: "dia-fixo", dia: 31 } }), periodo)).toBe("2026-11-30");
    expect(dataDePagamento(perfilJose({ diaPagamento: { tipo: "no-fechamento" } }), periodo)).toBe("2026-11-20");
  });

  it("frase de quanto falta", () => {
    expect(quandoFalta("2026-11-09", "2026-11-09")).toBe("hoje");
    expect(quandoFalta("2026-11-09", "2026-11-10")).toBe("amanhã");
    expect(quandoFalta("2026-11-09", "2026-12-05")).toBe("em 26 dias");
    expect(quandoFalta("2026-11-09", "2026-11-08")).toBe("ontem");
    expect(quandoFalta("2026-11-09", "2026-11-06")).toBe("há 3 dias");
  });
});
