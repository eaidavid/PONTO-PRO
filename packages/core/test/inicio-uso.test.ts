import { describe, expect, it } from "vitest";
import { ganhosPorDia } from "../src/assistente";
import { calcularPeriodo } from "../src/calculo/periodo";
import { calcularPrevisao } from "../src/previsao";
import { dia, perfilJose } from "./ajuda";

// Período 21/10 a 20/11/2026: feriados nacionais em 02/11 (segunda) e 20/11 (sexta).
const PERIODO = { inicio: "2026-10-21", fim: "2026-11-20" };
const feriado = (r: ReturnType<typeof calcularPeriodo>) => r.ganhos.find((l) => l.descricao.toLowerCase().includes("feriado"))?.valor ?? 0;

describe("dias antes do primeiro uso do app", () => {
  it("sem início de uso, o feriado de antes entra como dia pago (comportamento antigo)", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: PERIODO });
    expect(r.horas.abonoMin).toBeGreaterThan(0);
  });

  it("feriado antes do início de uso não vira dinheiro; o de depois continua pago", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: PERIODO, inicioUso: "2026-11-19" });
    const dia02 = r.dias.find((d) => d.data === "2026-11-02")!;
    const dia20 = r.dias.find((d) => d.data === "2026-11-20")!;
    expect(dia02.abonoMin).toBe(0);
    expect(dia20.abonoMin).toBeGreaterThan(0);
    expect(feriado(r)).toBe(Math.round((dia20.abonoMin / 60) * 2500));
  });

  it("dias de trabalho antes do início não contam falta nem horas previstas", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: PERIODO, inicioUso: "2026-11-19" });
    const antes = r.dias.filter((d) => d.data < "2026-11-19");
    expect(antes.every((d) => d.deficitMin === 0 && d.previstoMin === 0)).toBe(true);
    expect(r.horas.deficitMin).toBe(0);
  });

  it("registro de antes do início (importado ou digitado) conta normalmente", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: PERIODO, inicioUso: "2026-11-19", registros: [dia("2026-11-03", "07:00", "11:00", "12:00", "17:00")] });
    expect(r.dias.find((d) => d.data === "2026-11-03")!.trabalhadoMin).toBe(9 * 60);
    expect(r.horas.trabalhadoMin).toBe(9 * 60);
  });

  it("previsão de quem começou ontem à noite: só os dias dali em diante", () => {
    const agora = { data: "2026-11-19", hora: "22:09", minutos: 22 * 60 + 9 };
    const sem = calcularPrevisao({ perfil: perfilJose(), periodo: PERIODO, agora, hoje: "2026-11-19" });
    const com = calcularPrevisao({ perfil: perfilJose(), periodo: PERIODO, agora, hoje: "2026-11-19", inicioUso: "2026-11-19" });
    expect(com.realizado.liquido).toBeLessThan(sem.realizado.liquido);
    expect(com.realizado.dias.filter((d) => d.data < "2026-11-19").every((d) => d.abonoMin === 0)).toBe(true);
  });

  it("ganho por dia ignora o feriado de antes do início", () => {
    const g = ganhosPorDia({ perfil: perfilJose(), periodo: PERIODO, inicioUso: "2026-11-19" });
    expect(g.find((x) => x.data === "2026-11-02")!.total).toBe(0);
    expect(g.find((x) => x.data === "2026-11-20")!.total).toBeGreaterThan(0);
  });
});
