import {
  agoraEmSaoPaulo,
  type DiaRegistro,
  type Etapa,
  formatarDuracao,
  formatarQuantidade,
  formatarReais,
  horaParaMin,
  type ItemProducao,
  type LancamentoProducao,
  rotuloUnidade,
  valorProducao,
} from "@ponto-pro/core";

/*
 * O "histórico do dia": a linha do tempo do que a pessoa fez e as alterações feitas depois.
 * Funções puras (sem banco), para testar e para a tela só desenhar.
 */

const NOME_ETAPA: Record<Etapa, string> = {
  entrada: "Começou a trabalhar",
  almoco: "Saiu para o almoço",
  volta: "Voltou do almoço",
  saida: "Foi embora",
};

const NOME_TIPO: Record<DiaRegistro["tipo"], string> = {
  normal: "Dia normal",
  falta: "Falta",
  atestado: "Atestado",
  feriado: "Feriado",
  folga: "Folga",
  compensado: "Compensado",
};

export type PassoDoDia =
  | { tipo: "marcacao"; etapa: Etapa; hora: string; texto: string }
  | { tipo: "intervalo"; minutos: number; texto: string; almoco: boolean };

function duracao(de: string, ate: string) {
  let d = horaParaMin(ate) - horaParaMin(de);
  if (d < 0) d += 24 * 60; // passou da meia-noite
  return d;
}

/** Horários do dia em ordem, com o tempo entre eles ("trabalhou 5h04", "almoço de 1h01"). */
export function linhaDoTempo(m: DiaRegistro["marcacoes"]): PassoDoDia[] {
  const ordem: Etapa[] = ["entrada", "almoco", "volta", "saida"];
  const marcadas = ordem.filter((e) => m[e]);
  const passos: PassoDoDia[] = [];
  marcadas.forEach((e, i) => {
    if (i > 0) {
      const anterior = marcadas[i - 1]!;
      const min = duracao(m[anterior]!, m[e]!);
      const almoco = anterior === "almoco" && e === "volta";
      passos.push({ tipo: "intervalo", minutos: min, almoco, texto: almoco ? `Almoço de ${formatarDuracao(min)}` : `Trabalhou ${formatarDuracao(min)}` });
    }
    passos.push({ tipo: "marcacao", etapa: e, hora: m[e]!, texto: NOME_ETAPA[e] });
  });
  return passos;
}

export interface VersaoSalva {
  /** Como estava antes desta gravação (null = não existia). */
  antes: unknown;
  /** Quando a gravação aconteceu (ISO). */
  em: string;
}

export interface Alteracao {
  /** "12/11 às 10:16" */
  quando: string;
  em: string;
  /** Mudanças em frases curtas. */
  mudancas: string[];
}

function quando(em: string) {
  const a = agoraEmSaoPaulo(new Date(em));
  return `${a.data.slice(8, 10)}/${a.data.slice(5, 7)} às ${a.hora}`;
}

function marcacoesTexto(r: DiaRegistro) {
  const m = r.marcacoes;
  if (m.entrada && m.saida) return `${m.entrada} às ${m.saida}`;
  if (m.entrada) return `entrada ${m.entrada}`;
  return NOME_TIPO[r.tipo].toLowerCase();
}

/** O que mudou de uma versão do dia para a seguinte. */
export function diferencasDoDia(antes: DiaRegistro | null, depois: DiaRegistro | null, nomeObra: (id?: string) => string | undefined = () => undefined): string[] {
  if (!antes && !depois) return [];
  if (!antes) return [`Dia registrado: ${marcacoesTexto(depois!)}`];
  if (!depois) return ["Registro do dia apagado"];
  const mud: string[] = [];
  if (antes.tipo !== depois.tipo) mud.push(`Tipo do dia: ${NOME_TIPO[antes.tipo]} → ${NOME_TIPO[depois.tipo]}`);
  const rotulo: Record<Etapa, string> = { entrada: "Entrada", almoco: "Almoço", volta: "Volta", saida: "Saída" };
  for (const e of ["entrada", "almoco", "volta", "saida"] as Etapa[]) {
    const a = antes.marcacoes[e];
    const d = depois.marcacoes[e];
    if (a === d) continue;
    mud.push(!a ? `${rotulo[e]} marcada às ${d}` : !d ? `${rotulo[e]} das ${a} apagada` : `${rotulo[e]}: ${a} → ${d}`);
  }
  if ((antes.obraId ?? "") !== (depois.obraId ?? "")) mud.push(`Obra: ${nomeObra(antes.obraId) ?? "nenhuma"} → ${nomeObra(depois.obraId) ?? "nenhuma"}`);
  if ((antes.observacao ?? "") !== (depois.observacao ?? "")) mud.push(depois.observacao ? "Nota do dia mudou" : "Nota do dia apagada");
  return mud;
}

/**
 * Lista de alterações do ponto do dia, da mais nova para a mais antiga.
 * Cada versão salva guarda como o dia estava ANTES de uma gravação; a versão seguinte (ou o atual) é o "depois".
 */
export function alteracoesDoDia(versoes: VersaoSalva[], atual: DiaRegistro | null, nomeObra?: (id?: string) => string | undefined): Alteracao[] {
  const ordem = [...versoes].sort((a, b) => a.em.localeCompare(b.em));
  const lista: Alteracao[] = [];
  ordem.forEach((v, i) => {
    const antes = (v.antes as DiaRegistro | null) ?? null;
    const depois = i + 1 < ordem.length ? ((ordem[i + 1]!.antes as DiaRegistro | null) ?? null) : atual;
    const mudancas = diferencasDoDia(antes, depois, nomeObra);
    if (mudancas.length) lista.push({ quando: quando(v.em), em: v.em, mudancas });
  });
  return lista.reverse();
}

/** "Lançou 4 apartamento de Furação de Blocos (R$ 100,00)" para cada lançamento criado. */
export function alteracoesDaProducao(
  lancamentos: (LancamentoProducao & { atualizadoEm?: string })[],
  versoes: Map<string, VersaoSalva[]>,
  itens: ItemProducao[],
): Alteracao[] {
  const porId = new Map(itens.map((i) => [i.id, i]));
  const lista: Alteracao[] = [];
  for (const l of lancamentos) {
    const item = porId.get(l.itemId);
    const nome = item?.nome ?? "Serviço";
    const un = item ? rotuloUnidade(item.unidade) : "";
    const criado = (versoes.get(l.id) ?? []).find((v) => v.antes == null)?.em ?? l.atualizadoEm;
    if (!criado) continue;
    lista.push({
      quando: quando(criado),
      em: criado,
      mudancas: [`Lançou ${formatarQuantidade(l.quantidade)} ${un} de ${nome} (${formatarReais(valorProducao(l.quantidade, l.precoUnitario))})`.replace(/\s+/g, " ")],
    });
  }
  return lista;
}
