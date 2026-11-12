import { DiaRegistro, ItemProducao, LancamentoProducao } from "@ponto-pro/core";
import { describe, expect, it } from "vitest";
import { converterPontoAntigo } from "../lib/importar-antigo";

const estado = {
  cfg: { nome: " Ana ", empresa: "Construtora Sol", cargo: "", rate: 25 },
  days: {
    // dias de exemplo gravados pelo app antigo (horários exatos de exemplo)
    "2026-10-20": { t: ["07:00", "12:00", "13:00", "17:00"], type: "normal" },
    "2026-11-02": { t: ["07:00", "", "", "12:00"], type: "feriado" },
    // mesmo dia de exemplo, mas a pessoa mudou o horário: é dado real
    "2026-10-21": { t: ["07:10", "12:00", "13:00", "17:00"], type: "normal" },
    "2026-11-10": { t: ["06:55", "12:00", "13:00", "18:20"], type: "normal" },
    "2026-11-11": { t: ["", "", "", ""], type: "falta" },
    "2026-11-12": { t: ["07:00", "", "", ""], type: "normal" },
    "2026-11-13": { t: ["", "", "", ""], type: "normal" }, // vazio: não entra
    "2026-11-14": { t: ["08:00", "", "", "12:00"], type: "esquisito" }, // tipo desconhecido vira normal
    "data-ruim": { t: [] },
  },
  prod: [
    { d: "2026-11-10", id: "pis", q: 12.5, t: "banheiro" },
    { d: "2026-11-10", id: "c1", q: 3 },
    { d: "2026-11-10", id: "mur", q: 10 },
    { d: "2026-11-11", id: "naoexiste", q: 1 },
    { d: "2026-11-11", id: "pis", q: 0 },
  ],
  precos: { pis: 38.5, c1: 15 },
  custom: [{ id: "c1", n: "Rejunte", u: "m²", a: "Meus serviços" }],
  uni: { mur: "m" },
};

const itensPingou: ItemProducao[] = [{ id: "construcao.pisos.1", nome: "Assentamento de piso", area: "Pisos", unidade: "m2", preco: 3500, exemplo: true }];

describe("importar do Ponto Pro antigo", () => {
  it("converte ponto, produção e dados pessoais, deixando de fora os dias de exemplo", () => {
    const r = converterPontoAntigo(JSON.stringify({ app: "Ponto Pro antigo", versao: 2, estado }), { itens: itensPingou, datasComRegistro: [] });
    expect(r.registros.map((x) => x.data)).toEqual(["2026-10-21", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-14"]);
    expect(r.registros[1]).toEqual({ data: "2026-11-10", tipo: "normal", marcacoes: { entrada: "06:55", almoco: "12:00", volta: "13:00", saida: "18:20" } });
    expect(r.registros[2]).toEqual({ data: "2026-11-11", tipo: "falta", marcacoes: {} });
    expect(r.registros[4]!.tipo).toBe("normal");
    for (const x of r.registros) expect(DiaRegistro.safeParse(x).success).toBe(true);

    expect(r.resumo).toEqual({ dias: 5, jaExistem: 0, exemplos: 2, lancamentos: 3, ignorados: 3, primeiro: "2026-10-21", ultimo: "2026-11-14" });
    expect(r.pessoal).toEqual({ nome: "Ana", empresa: "Construtora Sol" });
  });

  it("reaproveita o serviço do Pingou com o mesmo nome e unidade e cria os que faltam", () => {
    const r = converterPontoAntigo(JSON.stringify(estado), { itens: itensPingou, datasComRegistro: [] });
    const [piso, rejunte, muro] = r.lancamentos;
    expect(piso).toMatchObject({ itemId: "construcao.pisos.1", quantidade: 12.5, precoUnitario: 3850, descricao: "banheiro" });
    expect(rejunte).toMatchObject({ itemId: "antigo-c1", precoUnitario: 1500 });
    expect(muro).toMatchObject({ itemId: "antigo-mur", precoUnitario: 3800 });
    expect(r.itensNovos).toEqual([
      { id: "antigo-c1", nome: "Rejunte", area: "Meus serviços", unidade: "m2", preco: 1500, exemplo: false },
      { id: "antigo-mur", nome: "Muro de fechamento", area: "Externos e acabamento", unidade: "m", preco: 3800, exemplo: false },
    ]);
    for (const i of r.itensNovos) expect(ItemProducao.safeParse(i).success).toBe(true);
    for (const l of r.lancamentos) expect(LancamentoProducao.safeParse(l).success).toBe(true);
  });

  it("não mexe nos dias que já existem no Pingou e é seguro importar de novo", () => {
    const r = converterPontoAntigo(JSON.stringify(estado), { itens: [], datasComRegistro: ["2026-11-10", "2026-11-11"] });
    expect(r.registros.map((x) => x.data)).toEqual(["2026-10-21", "2026-11-12", "2026-11-14"]);
    expect(r.resumo.jaExistem).toBe(2);
    // mesmos ids nos lançamentos: importar de novo substitui em vez de duplicar
    const outra = converterPontoAntigo(JSON.stringify(estado), { itens: [], datasComRegistro: [] });
    expect(outra.lancamentos.map((l) => l.id)).toEqual(r.lancamentos.map((l) => l.id));
  });

  it("pode incluir os dias de exemplo, se a pessoa quiser", () => {
    const r = converterPontoAntigo(JSON.stringify(estado), { itens: [], datasComRegistro: [] }, { incluirExemplos: true });
    expect(r.resumo.exemplos).toBe(0);
    expect(r.registros.map((x) => x.data)).toContain("2026-10-20");
  });

  it("recusa texto que não é do app antigo", () => {
    expect(() => converterPontoAntigo("olá", { itens: [], datasComRegistro: [] })).toThrow(/não é a cópia/);
    expect(() => converterPontoAntigo('{"app":"Ponto Pro"}', { itens: [], datasComRegistro: [] })).toThrow(/Não achei registros/);
    expect(() => converterPontoAntigo("null", { itens: [], datasComRegistro: [] })).toThrow(/Não achei registros/);
  });
});
