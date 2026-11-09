import { describe, expect, it } from "vitest";
import { calcularPeriodo } from "../src/calculo/periodo";
import {
  agruparPorSemana,
  agruparPorSemanaGenerico,
  categoriasDe,
  completarComEscala,
  conferirPagamento,
  csvDoPeriodo,
  filtrarDias,
  filtrarLancamentos,
  ordenarPorUso,
  resumoDoPeriodo,
} from "../src/historico";
import { dia, perfilJose } from "./ajuda";

const p = perfilJose();
const periodo = { inicio: "2026-10-25", fim: "2026-11-07" };
const registros = [
  dia("2026-10-26", "07:00", "12:00", "13:00", "17:00"),
  dia("2026-10-27", "07:00", "12:00", "13:00", "18:00"),
  { ...dia("2026-10-28", undefined, undefined, undefined, undefined, "falta"), observacao: "Chuva, obra parada" },
  dia("2026-10-29", undefined, undefined, undefined, undefined, "atestado"),
  { ...dia("2026-10-30", "07:00"), obraId: "o2" },
  dia("2026-10-31", "07:00", undefined, undefined, "12:00"),
  { ...dia("2026-11-03", "07:00", "12:00", "13:00", "17:00"), obraId: "o1" },
];
const obras = [{ id: "o1", nome: "Obra Jardim", arquivada: false }, { id: "o2", nome: "Casa da Ana", arquivada: false }];
const r = calcularPeriodo({ perfil: p, periodo, registros });
const datas = (l: { data: string }[]) => l.map((d) => d.data);

describe("filtros e busca do histórico", () => {
  it("filtra por tipo de situação", () => {
    expect(datas(filtrarDias(r.dias, { filtro: "extra", registros }))).toEqual(["2026-10-27", "2026-10-31"]);
    expect(datas(filtrarDias(r.dias, { filtro: "faltas", registros }))).toEqual(["2026-10-28"]);
    expect(datas(filtrarDias(r.dias, { filtro: "atestado", registros }))).toEqual(["2026-10-29"]);
    expect(datas(filtrarDias(r.dias, { filtro: "sem-saida", registros }))).toEqual(["2026-10-30"]);
    expect(datas(filtrarDias(r.dias, { filtro: "feriado", registros }))).toEqual(["2026-11-02"]);
    expect(datas(filtrarDias(r.dias, { filtro: "com-nota", registros }))).toEqual(["2026-10-28"]);
    expect(filtrarDias(r.dias, { filtro: "fim-de-semana", registros })).toHaveLength(4);
    expect(filtrarDias(r.dias, { registros })).toHaveLength(14);
  });

  it("busca por nota, obra, data, dia da semana e horário, sem acento", () => {
    expect(datas(filtrarDias(r.dias, { busca: "chuva", registros }))).toEqual(["2026-10-28"]);
    expect(datas(filtrarDias(r.dias, { busca: "jardim", registros, obras }))).toEqual(["2026-11-03"]);
    expect(datas(filtrarDias(r.dias, { busca: "03/11", registros }))).toEqual(["2026-11-03"]);
    expect(datas(filtrarDias(r.dias, { busca: "sáb", registros }))).toEqual(["2026-10-31", "2026-11-07"]);
    expect(datas(filtrarDias(r.dias, { busca: "18:00", registros }))).toEqual(["2026-10-27"]);
    expect(datas(filtrarDias(r.dias, { busca: "finados", registros }))).toEqual(["2026-11-02"]);
    expect(datas(filtrarDias(r.dias, { obraId: "o2", registros }))).toEqual(["2026-10-30"]);
  });
});

describe("agrupamento por semana", () => {
  it("soma horas e saldo por semana, na ordem recebida", () => {
    const g = agruparPorSemana([...r.dias].reverse());
    expect(g.map((x) => x.rotulo)).toEqual(["Semana de 01/11 a 07/11", "Semana de 25/10 a 31/10"]);
    expect(g[1]!.trabalhadoMin).toBe(540 + 600 + 300);
    expect(g[1]!.saldoMin).toBe(0 + 60 - 540 + 300);
    const gen = agruparPorSemanaGenerico([{ data: "2026-11-05" }, { data: "2026-11-01" }, { data: "2026-10-28" }]);
    expect(gen.map((x) => x.itens.length)).toEqual([2, 1]);
  });
});

describe("produção: busca, categorias e uso", () => {
  const itens = [
    { id: "a", nome: "Assentar meio-fio", area: "Externos", unidade: "m", preco: 1200, exemplo: false },
    { id: "b", nome: "Pintura látex", area: "Pintura", unidade: "m2", preco: 1500, exemplo: false, favorito: true },
    { id: "c", nome: "Reboco", area: "Revestimentos", unidade: "m2", preco: 2500, exemplo: false },
  ];
  const lancs = [
    { id: "1", data: "2026-11-05", itemId: "a", quantidade: 50, precoUnitario: 1200, obraId: "o1" },
    { id: "2", data: "2026-11-04", itemId: "c", quantidade: 10, precoUnitario: 2500, descricao: "sala" },
    { id: "3", data: "2026-11-03", itemId: "a", quantidade: 10, precoUnitario: 1200 },
  ];
  it("filtra por busca, área e obra", () => {
    expect(filtrarLancamentos(lancs, { itens, busca: "meio fio" }).map((l) => l.id)).toEqual(["1", "3"]);
    expect(filtrarLancamentos(lancs, { itens, busca: "sala" }).map((l) => l.id)).toEqual(["2"]);
    expect(filtrarLancamentos(lancs, { itens, area: "Revestimentos" }).map((l) => l.id)).toEqual(["2"]);
    expect(filtrarLancamentos(lancs, { itens, obraId: "o1" }).map((l) => l.id)).toEqual(["1"]);
    expect(filtrarLancamentos(lancs, { itens })).toHaveLength(3);
  });
  it("categorias e ordem por favorito e uso", () => {
    expect(categoriasDe(itens)).toEqual(["Externos", "Pintura", "Revestimentos"]);
    expect(ordenarPorUso(itens, lancs).map((i) => i.id)).toEqual(["b", "a", "c"]);
  });
});

describe("completar com a escala", () => {
  it("cria só os dias de trabalho sem registro, antes de hoje e fora de feriado", () => {
    const novos = completarComEscala(p, r.dias, "2026-11-06");
    expect(datas(novos)).toEqual(["2026-11-04", "2026-11-05"]);
    expect(novos[0]!.marcacoes).toEqual({ entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:00" });
  });
});

describe("conferir pagamento", () => {
  const perfil = perfilJose({ descontos: [{ id: "d", nome: "INSS", tipo: "percentual", valor: 9 }] });
  const res = calcularPeriodo({ perfil, periodo, registros });

  it("bate, a menos (com pista) e a mais", () => {
    expect(conferirPagamento(res, res.liquido + 50).situacao).toBe("igual");
    const sab = res.ganhos.find((l) => l.codigo === "021")!;
    const menos = conferirPagamento(res, res.liquido - sab.valor);
    expect(menos.situacao).toBe("a-menos");
    expect(menos.frase).toContain("a menos");
    expect(menos.pistas.some((x) => x.startsWith("Hora extra sábado"))).toBe(true);
    const mais = conferirPagamento(res, res.liquido + res.descontos[0]!.valor);
    expect(mais.situacao).toBe("a-mais");
    expect(mais.pistas[0]).toContain("INSS");
  });

  it("sem pista exata, sugere extras e abonos para conferir", () => {
    const c = conferirPagamento(res, res.liquido - 7_777);
    expect(c.pistas.length).toBeGreaterThan(0);
  });
});

describe("resumo e CSV do período", () => {
  it("resume horas e valores", () => {
    const s = resumoDoPeriodo({ perfil: p, periodo, registros });
    expect(s).toMatchObject({ inicio: "2026-10-25", fim: "2026-11-07", bruto: r.bruto, liquido: r.liquido });
  });
  it("gera CSV com ponto, nota, obra e produção", () => {
    const itens = [{ id: "a", nome: "Assentar; meio-fio", area: "X", unidade: "m", preco: 1200, exemplo: false }];
    const csv = csvDoPeriodo(r, registros, {
      itens,
      obras,
      lancamentos: [
        { id: "1", data: "2026-11-05", itemId: "a", quantidade: 12.5, precoUnitario: 1200 },
        { id: "2", data: "2026-12-05", itemId: "a", quantidade: 1, precoUnitario: 1200 },
      ],
    });
    const linhas = csv.split("\n");
    expect(linhas[0]).toBe("Data;Dia;Tipo;Entrada;Almoço;Volta;Saída;Trabalhado;Saldo;Obra;Nota");
    expect(csv).toContain("28/10/2026;qua;falta;;;;;0h00;-9h00;;Chuva, obra parada");
    expect(csv).toContain("feriado (Finados)");
    expect(csv).toContain("Obra Jardim");
    expect(csv).toContain('"Assentar; meio-fio";12,5;m;12,00;150,00');
    expect(csv).not.toContain("05/12");
    expect(linhas.at(-1)).toMatch(/^Líquido \(estimativa\);/);
  });
});
