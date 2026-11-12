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

    expect(r.resumo).toEqual({ dias: 5, jaExistem: 0, exemplos: 2, lancamentos: 3, lancamentosJaExistem: 0, ignorados: 3, primeiro: "2026-10-21", ultimo: "2026-11-14" });
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
    // e quem já importou vê que os lançamentos já estão lá
    const de_novo = converterPontoAntigo(JSON.stringify(estado), { itens: [], datasComRegistro: [], idsLancamentos: r.lancamentos.map((l) => l.id) });
    expect(de_novo.lancamentos).toEqual([]);
    expect(de_novo.resumo.lancamentosJaExistem).toBe(3);
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

import { calcularPeriodo } from "@ponto-pro/core";
import { aplicarRegrasAntigas } from "../lib/importar-antigo";
import { perfilJose } from "../../../packages/core/test/ajuda";

describe("regras de cálculo do app antigo", () => {
  const cfgAntigo = { rate: 25, jornada: 8, almoco: 60, fecha: 20, x50: 50, x100: 100, inss: 8, outros: 0 };
  const dias = {
    "2026-11-10": { t: ["07:00", "12:00", "13:00", "17:00"], type: "normal" }, // ter: 9h → 8h + 1h extra
    "2026-11-14": { t: ["07:00", "", "", "12:00"], type: "normal" }, // sáb: 5h, tudo extra a 100%
  };

  it("lê as regras e lista o que muda no perfil", () => {
    const conv = converterPontoAntigo(JSON.stringify({ cfg: cfgAntigo, days: dias }), { itens: [], datasComRegistro: [] });
    expect(conv.regras).toEqual({ valorHora: 2500, jornadaMin: 480, almocoMin: 60, diaFechamento: 20, extraDiaUtil: 50, extraFimDeSemana: 100, descontoPct: 8, outrosDescontos: 0 });
    const { perfil, mudancas } = aplicarRegrasAntigas(perfilJose(), conv.regras!);
    expect(perfil.pagamento).toEqual({ forma: "hora", valorHora: 2500 });
    expect(perfil.escala.tipo === "semanal" && perfil.escala.dias.map((d) => d.horasLiquidasMin)).toEqual([0, 480, 480, 480, 480, 480, 0]);
    expect(mudancas.some((m) => m.startsWith("Sua semana:"))).toBe(true);
    expect(mudancas.some((m) => m.startsWith("Descontos:"))).toBe(true);
    expect(perfil.sugestoes.some((c) => c.startsWith("escala") || c.startsWith("descontos"))).toBe(false);
  });

  it("com as regras do app antigo, o Pingou chega no mesmo valor que ele mostrava", () => {
    const conv = converterPontoAntigo(JSON.stringify({ cfg: cfgAntigo, days: dias }), { itens: [], datasComRegistro: [] });
    const { perfil } = aplicarRegrasAntigas(perfilJose(), conv.regras!);
    const r = calcularPeriodo({ perfil, periodo: { inicio: "2026-11-10", fim: "2026-11-14" }, registros: conv.registros });
    // app antigo: 8h × 25 + 1h × 25 × 1,5 + 5h × 25 × 2 = 487,50; desconto de 8% = 39,00
    expect(r.bruto).toBe(48750);
    expect(r.totalDescontos).toBe(3900);
    expect(r.liquido).toBe(44850);
  });

  it("sem valor da hora ou jornada no app antigo, não há regras para trazer", () => {
    expect(converterPontoAntigo(JSON.stringify({ cfg: { rate: 0, jornada: 8 }, days: dias }), { itens: [], datasComRegistro: [] }).regras).toBeNull();
  });

  it("não lista mudança quando o perfil já calcula igual", () => {
    const conv = converterPontoAntigo(JSON.stringify({ cfg: cfgAntigo, days: dias }), { itens: [], datasComRegistro: [] });
    const uma = aplicarRegrasAntigas(perfilJose(), conv.regras!).perfil;
    expect(aplicarRegrasAntigas(uma, conv.regras!).mudancas).toEqual([]);
  });
});

describe("dias de exemplo de versões anteriores do app antigo", () => {
  it("reconhece exemplos com outra saída redonda e mantém os dias reais com minutos quebrados", () => {
    const dias = {
      "2026-10-21": { t: ["07:00", "12:00", "13:00", "18:00"], type: "normal" }, // exemplo antigo (saída 18:00)
      "2026-10-22": { t: ["07:00", "12:00", "13:00", "18:00"], type: "normal" },
      "2026-11-02": { t: ["07:00", "", "", "12:00"], type: "feriado" },
      "2026-11-03": { t: ["06:58", "12:00", "13:00", "17:00"], type: "normal" }, // real
      "2026-11-04": { t: ["06:54", "11:56", "12:59", "18:02"], type: "normal" }, // real
    };
    const r = converterPontoAntigo(JSON.stringify({ days: dias }), { itens: [], datasComRegistro: [] });
    expect(r.resumo.exemplos).toBe(3);
    expect(r.registros.map((x) => x.data)).toEqual(["2026-11-03", "2026-11-04"]);
  });
});
