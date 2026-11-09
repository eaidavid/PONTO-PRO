import { describe, expect, it } from "vitest";
import { analisarDia } from "../src/calculo/dia";
import { ganhoDoDia } from "../src/calculo/periodo";
import { ganhosPorDia, lembretesDoDia, pendenciasDoPeriodo, saidaPrevista, statusDoDia, validarMarcacoes } from "../src/assistente";
import { calcularPeriodo } from "../src/calculo/periodo";
import { escalaDoDia } from "../src/escala";
import { dia, perfilJose, SEMANA, semanaJose } from "./ajuda";

const agora = (hora: string, data = "2026-11-09") => ({ data, hora, minutos: Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)) });
const p = perfilJose();

function status(reg: ReturnType<typeof dia> | undefined, hora: string, data = "2026-11-09", feriado?: { data: string; nome: string; tipo: "nacional" }) {
  const a = agora(hora, data);
  const d = analisarDia(p, data, reg, feriado, { agoraMin: a.minutos });
  return statusDoDia(d, reg?.marcacoes ?? {}, a);
}

describe("saída prevista", () => {
  const seg = escalaDoDia(p.escala, "2026-11-09");
  it("usa a entrada real e o almoço real quando já voltou", () => {
    expect(saidaPrevista(seg, {})).toBe("17:00");
    expect(saidaPrevista(seg, { entrada: "07:02" })).toBe("17:02");
    expect(saidaPrevista(seg, { entrada: "07:00", almoco: "12:00", volta: "12:30" })).toBe("16:30");
    expect(saidaPrevista(seg, { entrada: "07:00", saida: "18:00" })).toBe("18:00");
    expect(saidaPrevista(escalaDoDia(p.escala, "2026-11-08"), { entrada: "07:00" })).toBeNull();
  });
});

describe("status do dia em uma frase", () => {
  it("antes da entrada, no horário e atrasado", () => {
    expect(status(undefined, "06:30")).toEqual({ estado: "antes", titulo: "Ainda não bateu a entrada", detalhe: "Sua entrada é às 07:00." });
    expect(status(undefined, "07:30").detalhe).toBe("Sua entrada era às 07:00.");
  });
  it("trabalhando, almoço e depois da jornada", () => {
    expect(status(dia("2026-11-09", "07:02"), "09:41")).toEqual({ estado: "trabalhando", titulo: "Trabalhando há 2h39", detalhe: "Saída prevista às 17:02." });
    expect(status(dia("2026-11-09", "07:00", "12:00"), "12:10")).toEqual({ estado: "almoco", titulo: "No almoço desde 12:00", detalhe: "Volte às 13:00." });
    expect(status(dia("2026-11-09", "07:00", "12:00", "13:00"), "18:00").detalhe).toBe("Já passou 1h da jornada: conta como extra.");
  });
  it("dia encerrado com extra, falta ou completo", () => {
    expect(status(dia("2026-11-09", "07:00", "12:00", "13:00", "17:30"), "18:00")).toEqual({ estado: "encerrado", titulo: "Dia encerrado: 9h30", detalhe: "30min além da jornada.".replace("30min", "0h30") });
    expect(status(dia("2026-11-09", "07:00", "12:00", "13:00", "16:00"), "18:00").detalhe).toBe("Faltaram 1h para a jornada.");
    expect(status(dia("2026-11-09", "07:00", "12:00", "13:00", "17:00"), "18:00").detalhe).toBe("Jornada completa.");
    expect(status(dia("2026-11-08", "07:00", undefined, undefined, "11:00"), "12:00", "2026-11-08").detalhe).toBe("4h contam como hora extra.");
  });
  it("folga, feriado, falta e trabalho em folga", () => {
    expect(status(undefined, "09:00", "2026-11-08").estado).toBe("folga");
    expect(status(undefined, "09:00", "2026-11-02", { data: "2026-11-02", nome: "Finados", tipo: "nacional" }).titulo).toBe("Hoje é feriado: Finados");
    expect(status(dia("2026-11-09", undefined, undefined, undefined, undefined, "falta"), "09:00").titulo).toBe("Hoje está marcado como falta");
    expect(status(dia("2026-11-08", "07:00"), "09:00", "2026-11-08").detalhe).toBe("Hoje tudo conta como hora extra.");
  });
});

describe("lembretes de ponto esquecido", () => {
  const base = { perfil: p };
  it("ontem sem saída: corrige com a saída prevista e a volta do almoço", () => {
    // trabalhou na folga (domingo) e esqueceu a saída: também lembra
    const l = lembretesDoDia({ ...base, ontem: dia("2026-11-08", "07:00"), hoje: undefined, agora: agora("06:00") });
    expect(l[0]).toMatchObject({ id: "ontem-sem-saida", data: "2026-11-08", marcacoes: { saida: "17:00" } });
    const l2 = lembretesDoDia({ ...base, ontem: dia("2026-11-06", "07:00", "12:00"), hoje: undefined, agora: agora("06:00", "2026-11-07") });
    expect(l2[0]).toMatchObject({ id: "ontem-sem-saida", data: "2026-11-06", marcacoes: { saida: "16:00", volta: "13:00" }, acao: "Marcar saída às 16:00" });
  });
  it("entrada esquecida só depois de 1h de tolerância", () => {
    expect(lembretesDoDia({ ...base, ontem: undefined, hoje: undefined, agora: agora("07:50") })).toEqual([]);
    expect(lembretesDoDia({ ...base, ontem: undefined, hoje: undefined, agora: agora("08:10") })[0]).toMatchObject({ id: "sem-entrada", marcacoes: { entrada: "07:00" } });
  });
  it("almoço e saída esquecidos", () => {
    const sem = lembretesDoDia({ ...base, ontem: undefined, hoje: dia("2026-11-09", "07:00"), agora: agora("14:30") });
    expect(sem.map((x) => x.id)).toEqual(["sem-almoco"]);
    const saida = lembretesDoDia({ ...base, ontem: undefined, hoje: dia("2026-11-09", "07:00", "12:00", "13:00"), agora: agora("18:30") });
    expect(saida[0]).toMatchObject({ id: "sem-saida", marcacoes: { saida: "17:00" } });
  });
  it("não lembra em folga, feriado ou dia marcado", () => {
    expect(lembretesDoDia({ ...base, ontem: undefined, hoje: undefined, agora: agora("10:00", "2026-11-08") })).toEqual([]);
    expect(lembretesDoDia({ ...base, ontem: undefined, hoje: undefined, agora: agora("10:00"), feriadoHoje: { data: "2026-11-09", nome: "X", tipo: "local" } })).toEqual([]);
    expect(lembretesDoDia({ ...base, ontem: undefined, hoje: dia("2026-11-09", undefined, undefined, undefined, undefined, "falta"), agora: agora("10:00") })).toEqual([]);
  });
});

describe("pendências do período", () => {
  it("aponta dia sem saída e dia de trabalho sem registro, sem contar hoje e feriados", () => {
    const r = calcularPeriodo({
      perfil: p,
      periodo: { inicio: "2026-10-30", fim: "2026-11-04" },
      registros: [dia("2026-10-30", "07:00")],
      agora: agora("10:00", "2026-11-04"),
    });
    expect(pendenciasDoPeriodo(r.dias, "2026-11-04").map((x) => x.texto)).toEqual(["sex 30: falta a saída", "ter 03: sem registro"]);
  });
});

describe("validação dos horários", () => {
  it("avisa ordem quebrada, dia longo e almoço longo", () => {
    expect(validarMarcacoes({ entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:00" })).toEqual([]);
    expect(validarMarcacoes({ almoco: "12:00" })).toContain("Falta a entrada.");
    expect(validarMarcacoes({ entrada: "07:00", volta: "13:00", saida: "17:00" })).toContain("Falta a saída para o almoço.");
    expect(validarMarcacoes({ entrada: "07:00", almoco: "12:00", saida: "17:00" })).toContain("Falta a volta do almoço.");
    expect(validarMarcacoes({ entrada: "06:00", saida: "23:30" })).toContain("O dia passou de 16 horas. Confira os horários.");
    expect(validarMarcacoes({ entrada: "07:00", almoco: "10:00", volta: "15:00", saida: "18:00" })).toContain("O almoço passou de 4 horas. Confira os horários.");
    expect(validarMarcacoes({ entrada: "07:00", saida: "07:00" })).toContain("A entrada e a saída estão no mesmo horário.");
  });
});

describe("ganho por dia", () => {
  it("bate com o ganho de cada dia calculado sozinho", () => {
    const registros = [...semanaJose(), dia("2026-10-31", "07:00", undefined, undefined, "12:00")];
    const lancamentos = [{ id: "l", data: "2026-10-28", itemId: "x", quantidade: 10, precoUnitario: 1000 }];
    const g = ganhosPorDia({ perfil: p, periodo: SEMANA, registros, lancamentos });
    expect(g).toHaveLength(7);
    for (const d of g) {
      expect(d.total).toBe(ganhoDoDia({ perfil: p, data: d.data, registros, lancamentos }).bruto);
    }
    expect(g.find((d) => d.data === "2026-10-31")).toEqual({ data: "2026-10-31", normal: 0, extra: 18_750, total: 18_750 });
    expect(g.find((d) => d.data === "2026-10-28")!.total).toBe(22_500 + 10_000);
  });
});
