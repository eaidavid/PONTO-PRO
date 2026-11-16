import { dataDePagamento, MODELOS, periodoDaData, periodoVizinho } from "@ponto-pro/core";
import { describe, expect, it } from "vitest";
import { notificacoesDevidas } from "../lib/notificacoes/decidir";

const perfil = MODELOS.construcao.perfil("2026-11-01T10:00:00-03:00");
const agora = (data: string, hora: string) => ({ data, minutos: Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)), hora });

describe("notificações", () => {
  it("lembra a saída quando passou bem da hora prevista", () => {
    const hoje = { data: "2026-11-16", tipo: "normal" as const, marcacoes: { entrada: "07:00", almoco: "12:00", volta: "13:00" } };
    const cedo = notificacoesDevidas({ perfil, hoje, agora: agora("2026-11-16", "16:00"), jaEnviadas: new Set() });
    expect(cedo.find((n) => n.tipo === "saida")).toBeUndefined();
    const tarde = notificacoesDevidas({ perfil, hoje, agora: agora("2026-11-16", "19:30"), jaEnviadas: new Set() });
    expect(tarde.find((n) => n.tipo === "saida")?.titulo).toBe("Bateu a saída?");
    // uma vez por dia
    expect(notificacoesDevidas({ perfil, hoje, agora: agora("2026-11-16", "19:30"), jaEnviadas: new Set(["saida"]) }).find((n) => n.tipo === "saida")).toBeUndefined();
  });

  it("não manda nada de madrugada", () => {
    const hoje = { data: "2026-11-16", tipo: "normal" as const, marcacoes: { entrada: "07:00" } };
    expect(notificacoesDevidas({ perfil, hoje, agora: agora("2026-11-16", "23:10"), jaEnviadas: new Set() })).toEqual([]);
  });

  it("avisa no dia do pagamento, a partir das 8h", () => {
    const fech = perfil.ciclo.diaFechamento;
    const dia = dataDePagamento(perfil, periodoVizinho(periodoDaData("2026-12-03", fech), -1, fech));
    expect(notificacoesDevidas({ perfil, hoje: undefined, agora: agora(dia, "07:30"), jaEnviadas: new Set() })).toEqual([]);
    const n = notificacoesDevidas({ perfil, hoje: undefined, agora: agora(dia, "09:00"), jaEnviadas: new Set() });
    expect(n.map((x) => x.tipo)).toEqual(["pagamento"]);
  });
});
