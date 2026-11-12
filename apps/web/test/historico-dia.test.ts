import type { DiaRegistro } from "@ponto-pro/core";
import { describe, expect, it } from "vitest";
import { alteracoesDaProducao, alteracoesDoDia, diferencasDoDia, linhaDoTempo } from "../lib/historico-dia";

const dia = (m: DiaRegistro["marcacoes"], tipo: DiaRegistro["tipo"] = "normal", extra: Partial<DiaRegistro> = {}): DiaRegistro => ({ data: "2026-11-05", tipo, marcacoes: m, ...extra });

describe("linha do tempo do dia", () => {
  it("põe os horários em ordem com o tempo entre eles", () => {
    expect(linhaDoTempo({ entrada: "06:52", almoco: "11:56", volta: "12:57", saida: "17:55" }).map((p) => p.texto)).toEqual([
      "Começou a trabalhar", "Trabalhou 5h04", "Saiu para o almoço", "Almoço de 1h01", "Voltou do almoço", "Trabalhou 4h58", "Foi embora",
    ]);
  });
  it("dia sem almoço e plantão que vira a noite", () => {
    expect(linhaDoTempo({ entrada: "19:00", saida: "07:00" }).map((p) => p.texto)).toEqual(["Começou a trabalhar", "Trabalhou 12h00", "Foi embora"]);
    expect(linhaDoTempo({})).toEqual([]);
  });
});

describe("alterações do dia", () => {
  it("descreve cada mudança em frase curta", () => {
    const a = dia({ entrada: "07:00", saida: "17:00" });
    const b = dia({ entrada: "07:00", almoco: "12:00", saida: "17:55" }, "folga", { obraId: "o1", observacao: "chuva" });
    expect(diferencasDoDia(a, b, (id) => (id === "o1" ? "Edifício Sol" : undefined))).toEqual([
      "Tipo do dia: Dia normal → Folga", "Almoço marcada às 12:00", "Saída: 17:00 → 17:55", "Obra: nenhuma → Edifício Sol", "Nota do dia mudou",
    ]);
    expect(diferencasDoDia(b, dia({ entrada: "07:00" }, "folga", { obraId: "o1" }))).toContain("Saída das 17:55 apagada");
    expect(diferencasDoDia(b, dia({}, "folga", { obraId: "o1" }))).toContain("Nota do dia apagada");
    expect(diferencasDoDia(null, a)).toEqual(["Dia registrado: 07:00 às 17:00"]);
    expect(diferencasDoDia(null, dia({ entrada: "07:00" }))).toEqual(["Dia registrado: entrada 07:00"]);
    expect(diferencasDoDia(null, dia({}, "falta"))).toEqual(["Dia registrado: falta"]);
    expect(diferencasDoDia(a, null)).toEqual(["Registro do dia apagado"]);
    expect(diferencasDoDia(null, null)).toEqual([]);
  });

  it("monta a lista a partir das versões salvas, da mais nova para a mais antiga", () => {
    const v1 = { antes: null, em: "2026-11-05T09:52:00Z" }; // criou às 06:52 (São Paulo)
    const v2 = { antes: dia({ entrada: "06:52" }), em: "2026-11-05T20:55:00Z" }; // bateu a saída
    const v3 = { antes: dia({ entrada: "06:52", saida: "17:55" }), em: "2026-11-06T10:00:00Z" }; // gravação sem mudança
    const atual = dia({ entrada: "06:52", saida: "17:55" });
    const lista = alteracoesDoDia([v3, v1, v2], atual);
    expect(lista).toEqual([
      { quando: "05/11 às 17:55", em: v2.em, mudancas: ["Saída marcada às 17:55"] },
      { quando: "05/11 às 06:52", em: v1.em, mudancas: ["Dia registrado: entrada 06:52"] },
    ]);
  });

  it("lançamentos de produção entram como alteração do dia", () => {
    const itens = [{ id: "i1", nome: "Furação de Blocos", area: "x", unidade: "Apartamento", preco: 2500, exemplo: false }];
    const l = { id: "l1", data: "2026-11-05", itemId: "i1", quantidade: 4, precoUnitario: 2500 };
    const lista = alteracoesDaProducao([l, { ...l, id: "l2", itemId: "sumiu", atualizadoEm: "2026-11-05T12:00:00Z" }, { ...l, id: "l3" }], new Map([["l1", [{ antes: null, em: "2026-11-05T15:00:00Z" }]]]), itens);
    expect(lista.map((a) => a.mudancas[0])).toEqual(["Lançou 4 Apartamento de Furação de Blocos (R$ 100,00)", "Lançou 4 de Serviço (R$ 100,00)"]);
    expect(lista[0]!.quando).toBe("05/11 às 12:00");
  });
});
