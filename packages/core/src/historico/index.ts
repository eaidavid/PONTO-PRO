import type { DiaResultado, Linha, ResultadoPeriodo } from "../calculo/periodo";
import { calcularPeriodo, type EntradaPeriodo } from "../calculo/periodo";
import { formatarReais } from "../dinheiro";
import { escalaDoDia, marcacoesPrevistas } from "../escala";
import { normalizar, rotuloUnidade } from "../producao";
import type { PerfilTrabalho } from "../schema/perfil";
import type { ItemProducao, LancamentoProducao } from "../schema/producao";
import type { DiaRegistro, Obra } from "../schema/registro";
import { dataCurta, diaDaSemana, formatarDuracao, inicioDaSemana, seloDia, somarDias } from "../tempo";
import { saldoDoDia } from "../calculo/dia";
import { valorProducao } from "../dinheiro";

// ---------- filtros e busca do histórico de ponto ----------

export type FiltroDia = "todos" | "extra" | "faltas" | "atestado" | "feriado" | "sem-saida" | "fim-de-semana" | "com-nota";

export const FILTROS_DIA: { id: FiltroDia; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "extra", rotulo: "Hora extra" },
  { id: "faltas", rotulo: "Faltas" },
  { id: "sem-saida", rotulo: "Sem saída" },
  { id: "atestado", rotulo: "Atestado" },
  { id: "feriado", rotulo: "Feriado" },
  { id: "fim-de-semana", rotulo: "Fim de semana" },
  { id: "com-nota", rotulo: "Com nota" },
];

const NOMES_TIPO: Record<string, string> = {
  normal: "normal",
  falta: "falta",
  atestado: "atestado",
  feriado: "feriado",
  folga: "folga",
  compensado: "compensado",
};

export interface OpcoesFiltroDias {
  filtro?: FiltroDia;
  busca?: string;
  obraId?: string | null;
  registros: DiaRegistro[];
  obras?: Obra[];
}

/** Dias que passam no filtro e na busca (data "05/11", dia "seg", tipo, nota, obra ou horário). */
export function filtrarDias(dias: DiaResultado[], o: OpcoesFiltroDias): DiaResultado[] {
  const porData = new Map(o.registros.map((r) => [r.data, r]));
  const obras = new Map((o.obras ?? []).map((x) => [x.id, x.nome]));
  const q = normalizar(o.busca ?? "");
  return dias.filter((d) => {
    const reg = porData.get(d.data);
    switch (o.filtro ?? "todos") {
      case "extra":
        if (saldoDoDia(d) <= 0 && d.extraMin <= 0) return false;
        break;
      case "faltas":
        if (d.tipo !== "falta" && saldoDoDia(d) >= 0) return false;
        break;
      case "atestado":
        if (d.tipo !== "atestado") return false;
        break;
      case "feriado":
        if (!d.feriado) return false;
        break;
      case "sem-saida":
        if (!d.incompleto) return false;
        break;
      case "fim-de-semana":
        if (![0, 6].includes(diaDaSemana(d.data))) return false;
        break;
      case "com-nota":
        if (!reg?.observacao) return false;
        break;
    }
    if (o.obraId && reg?.obraId !== o.obraId) return false;
    if (!q) return true;
    const m = reg?.marcacoes ?? {};
    const alvo = normalizar(
      [
        seloDia(d.data),
        dataCurta(d.data),
        d.data,
        NOMES_TIPO[d.tipo],
        d.feriado ?? "",
        reg?.observacao ?? "",
        reg?.obraId ? (obras.get(reg.obraId) ?? "") : "",
        m.entrada ?? "",
        m.saida ?? "",
      ].join(" "),
    );
    return q.split(" ").every((p) => alvo.includes(p));
  });
}

// ---------- agrupamento por semana ----------

export interface GrupoSemana<T> {
  /** Domingo que inicia a semana. */
  inicio: string;
  fim: string;
  rotulo: string;
  itens: T[];
}

export interface SemanaDias extends GrupoSemana<DiaResultado> {
  trabalhadoMin: number;
  saldoMin: number;
}

/** Agrupa dias (em qualquer ordem) por semana, mantendo a ordem recebida. Com subtotal. */
export function agruparPorSemana(dias: DiaResultado[]): SemanaDias[] {
  const grupos: SemanaDias[] = [];
  const porInicio = new Map<string, SemanaDias>();
  for (const d of dias) {
    const ini = inicioDaSemana(d.data);
    let g = porInicio.get(ini);
    if (!g) {
      const fim = somarDias(ini, 6);
      g = { inicio: ini, fim, rotulo: `Semana de ${dataCurta(ini)} a ${dataCurta(fim)}`, itens: [], trabalhadoMin: 0, saldoMin: 0 };
      porInicio.set(ini, g);
      grupos.push(g);
    }
    g.itens.push(d);
    g.trabalhadoMin += d.trabalhadoMin;
    g.saldoMin += saldoDoDia(d);
  }
  return grupos;
}

/** Agrupa qualquer lista com data por semana (ex.: lançamentos de produção). */
export function agruparPorSemanaGenerico<T extends { data: string }>(itens: T[]): GrupoSemana<T>[] {
  const grupos: GrupoSemana<T>[] = [];
  const porInicio = new Map<string, GrupoSemana<T>>();
  for (const it of itens) {
    const ini = inicioDaSemana(it.data);
    let g = porInicio.get(ini);
    if (!g) {
      const fim = somarDias(ini, 6);
      g = { inicio: ini, fim, rotulo: `Semana de ${dataCurta(ini)} a ${dataCurta(fim)}`, itens: [] };
      porInicio.set(ini, g);
      grupos.push(g);
    }
    g.itens.push(it);
  }
  return grupos;
}

// ---------- busca e categorias na produção ----------

export interface OpcoesFiltroProducao {
  itens: ItemProducao[];
  busca?: string;
  /** Área (categoria) do serviço. */
  area?: string | null;
  obraId?: string | null;
}

export function filtrarLancamentos(lancamentos: LancamentoProducao[], o: OpcoesFiltroProducao): LancamentoProducao[] {
  const porId = new Map(o.itens.map((i) => [i.id, i]));
  const q = normalizar(o.busca ?? "");
  return lancamentos.filter((l) => {
    const item = porId.get(l.itemId);
    if (o.area && item?.area !== o.area) return false;
    if (o.obraId && l.obraId !== o.obraId) return false;
    if (!q) return true;
    const alvo = normalizar(`${item?.nome ?? ""} ${item?.area ?? ""} ${l.descricao ?? ""} ${seloDia(l.data)} ${dataCurta(l.data)}`);
    return q.split(" ").every((p) => alvo.includes(p));
  });
}

/** Categorias (áreas) presentes, na ordem do catálogo. */
export function categoriasDe(itens: ItemProducao[]): string[] {
  return [...new Set(itens.map((i) => i.area))];
}

/** Favoritos primeiro, depois os mais usados, depois o resto. */
export function ordenarPorUso(itens: ItemProducao[], lancamentos: LancamentoProducao[]): ItemProducao[] {
  const uso = new Map<string, number>();
  for (const l of lancamentos) uso.set(l.itemId, (uso.get(l.itemId) ?? 0) + 1);
  return [...itens].sort((a, b) => Number(!!b.favorito) - Number(!!a.favorito) || (uso.get(b.id) ?? 0) - (uso.get(a.id) ?? 0));
}

// ---------- completar com a escala ----------

/** Registros "como a escala" para os dias de trabalho sem registro (antes de hoje, sem feriado). */
export function completarComEscala(perfil: PerfilTrabalho, dias: DiaResultado[], hoje: string): DiaRegistro[] {
  return dias
    .filter((d) => d.data < hoje && !d.registrado && d.escala.trabalha && !d.feriado)
    .map((d) => ({ data: d.data, tipo: "normal" as const, marcacoes: marcacoesPrevistas(escalaDoDia(perfil.escala, d.data)) }));
}

// ---------- resumo de vários períodos ----------

export interface ResumoPeriodo {
  inicio: string;
  fim: string;
  trabalhadoMin: number;
  bruto: number;
  liquido: number;
}

export function resumoDoPeriodo(e: EntradaPeriodo): ResumoPeriodo {
  const r = calcularPeriodo(e);
  return { inicio: e.periodo.inicio, fim: e.periodo.fim, trabalhadoMin: r.horas.trabalhadoMin, bruto: r.bruto, liquido: r.liquido };
}

// ---------- conferir pagamento ----------

export interface Conferencia {
  estimado: number;
  recebido: number;
  /** recebido − estimado */
  diferenca: number;
  situacao: "igual" | "a-menos" | "a-mais";
  frase: string;
  /** Linhas do cálculo que podem explicar a diferença. */
  pistas: string[];
}

/** Compara o que foi pago com a estimativa e aponta de onde a diferença pode vir. */
export function conferirPagamento(r: Pick<ResultadoPeriodo, "liquido" | "ganhos" | "descontos">, recebido: number): Conferencia {
  const diferenca = recebido - r.liquido;
  const abs = Math.abs(diferenca);
  const tolerancia = Math.max(100, Math.round(r.liquido * 0.005)); // R$ 1 ou 0,5%
  if (abs <= tolerancia) {
    return { estimado: r.liquido, recebido, diferenca, situacao: "igual", frase: "O pagamento bate com a estimativa.", pistas: [] };
  }
  const linhas: Linha[] = diferenca < 0 ? r.ganhos : [...r.descontos, ...r.ganhos.filter((l) => l.tipo === "extra")];
  const perto = (v: number) => Math.abs(v - abs) <= Math.max(tolerancia, abs * 0.1);
  const pistas = linhas.filter((l) => perto(l.valor)).map((l) => `${l.descricao} (${formatarReais(l.valor)})`);
  if (pistas.length === 0 && diferenca < 0) {
    const extras = r.ganhos.filter((l) => l.tipo === "extra" || l.tipo === "abono").map((l) => `${l.descricao} (${formatarReais(l.valor)})`);
    pistas.push(...extras.slice(0, 3));
  }
  return {
    estimado: r.liquido,
    recebido,
    diferenca,
    situacao: diferenca < 0 ? "a-menos" : "a-mais",
    frase:
      diferenca < 0
        ? `Você recebeu ${formatarReais(abs)} a menos que a estimativa.`
        : `Você recebeu ${formatarReais(abs)} a mais que a estimativa.`,
    pistas,
  };
}

// ---------- exportar ----------

function csvCampo(v: string | number): string {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV do período (separador ";" e vírgula decimal, como o Excel em português espera). */
export function csvDoPeriodo(
  r: ResultadoPeriodo,
  registros: DiaRegistro[],
  extras: { itens?: ItemProducao[]; lancamentos?: LancamentoProducao[]; obras?: Obra[] } = {},
): string {
  const porData = new Map(registros.map((x) => [x.data, x]));
  const obras = new Map((extras.obras ?? []).map((o) => [o.id, o.nome]));
  const linhas: (string | number)[][] = [["Data", "Dia", "Tipo", "Entrada", "Almoço", "Volta", "Saída", "Trabalhado", "Saldo", "Obra", "Nota"]];
  for (const d of r.dias) {
    const reg = porData.get(d.data);
    const m = reg?.marcacoes ?? {};
    linhas.push([
      dataCurta(d.data) + "/" + d.data.slice(0, 4),
      seloDia(d.data).split(" ")[0]!,
      d.feriado ? `feriado (${d.feriado})` : d.tipo,
      m.entrada ?? "",
      m.almoco ?? "",
      m.volta ?? "",
      m.saida ?? "",
      formatarDuracao(d.trabalhadoMin),
      formatarDuracao(saldoDoDia(d), { sinal: true }),
      reg?.obraId ? (obras.get(reg.obraId) ?? "") : "",
      reg?.observacao ?? "",
    ]);
  }
  const itens = new Map((extras.itens ?? []).map((i) => [i.id, i]));
  const lancs = (extras.lancamentos ?? []).filter((l) => l.data >= r.periodo.inicio && l.data <= r.periodo.fim);
  if (lancs.length) {
    linhas.push([], ["Produção"], ["Data", "Serviço", "Quantidade", "Unidade", "Preço", "Valor"]);
    for (const l of lancs) {
      const it = itens.get(l.itemId);
      linhas.push([
        dataCurta(l.data),
        it?.nome ?? "Serviço",
        String(l.quantidade).replace(".", ","),
        rotuloUnidade(it?.unidade ?? "un"),
        (l.precoUnitario / 100).toFixed(2).replace(".", ","),
        (valorProducao(l.quantidade, l.precoUnitario) / 100).toFixed(2).replace(".", ","),
      ]);
    }
  }
  linhas.push([], ["Ganhos", (r.bruto / 100).toFixed(2).replace(".", ",")], ["Descontos", (r.totalDescontos / 100).toFixed(2).replace(".", ",")], ["Líquido (estimativa)", (r.liquido / 100).toFixed(2).replace(".", ",")]);
  return linhas.map((l) => l.map(csvCampo).join(";")).join("\n");
}
