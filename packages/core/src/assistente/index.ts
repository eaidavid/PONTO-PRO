import type { DiaAnalise } from "../calculo/dia";
import { calcularPeriodo, type EntradaPeriodo } from "../calculo/periodo";
import { datasDoPeriodo } from "../ciclo";
import { escalaDoDia, marcacoesPrevistas } from "../escala";
import type { DiaEscala, PerfilTrabalho } from "../schema/perfil";
import type { DiaRegistro, Feriado, Marcacoes } from "../schema/registro";
import { type Agora, formatarHorasCurto, horaParaMin, intervalosTrabalho, minParaHora, seloDia, somaIntervalos, somarDias } from "../tempo";

/**
 * Assistente do dia: respostas prontas para decidir em poucos segundos
 * ("o que faço agora?", "esqueci algo?", "tem dia errado?").
 */

// ---------- saída prevista ----------

/** Horário previsto de saída: entrada + horas do dia + almoço (o real, se já voltou). */
export function saidaPrevista(escala: DiaEscala, m: Marcacoes): string | null {
  if (m.saida) return m.saida;
  if (!escala.trabalha) return null;
  if (!m.entrada) return escala.fim ?? null;
  const almoco =
    m.almoco && m.volta ? (horaParaMin(m.volta) - horaParaMin(m.almoco) + 1440) % 1440 : escala.almocoMin;
  return minParaHora(horaParaMin(m.entrada) + escala.horasLiquidasMin + almoco);
}

// ---------- status do dia ----------

export type EstadoDia = "antes" | "trabalhando" | "almoco" | "encerrado" | "folga" | "feriado" | "ausente";

export interface StatusDia {
  estado: EstadoDia;
  /** Frase principal: responde "o que está acontecendo?". */
  titulo: string;
  /** Frase de apoio: responde "e agora?". */
  detalhe: string;
}

/** Status do dia em uma frase, para o topo da tela Hoje. */
export function statusDoDia(dia: DiaAnalise, m: Marcacoes, agora: Agora): StatusDia {
  const esc = dia.escala;
  if (dia.tipo === "falta" || dia.tipo === "atestado") {
    return { estado: "ausente", titulo: `Hoje está marcado como ${dia.tipo}`, detalhe: "Para mudar, abra Registros." };
  }
  if (!m.entrada) {
    if (dia.feriado) return { estado: "feriado", titulo: `Hoje é feriado: ${dia.feriado}`, detalhe: "Se trabalhar, as horas contam como extra." };
    if (!esc.trabalha || dia.tipo === "folga" || dia.tipo === "compensado") {
      return { estado: "folga", titulo: "Hoje é folga", detalhe: "Se trabalhar, as horas contam como extra." };
    }
    const inicio = esc.inicio ?? "07:00";
    const atrasado = agora.minutos > horaParaMin(inicio) + 15;
    return { estado: "antes", titulo: "Ainda não bateu a entrada", detalhe: atrasado ? `Sua entrada era às ${inicio}.` : `Sua entrada é às ${inicio}.` };
  }
  if (m.saida) {
    const previsto = dia.previstoMin;
    const saldo = dia.trabalhadoMin - previsto;
    const detalhe =
      previsto === 0
        ? `${formatarHorasCurto(dia.trabalhadoMin)} contam como hora extra.`
        : saldo > 0
          ? `${formatarHorasCurto(saldo)} além da jornada.`
          : saldo < 0
            ? `Faltaram ${formatarHorasCurto(-saldo)} para a jornada.`
            : "Jornada completa.";
    return { estado: "encerrado", titulo: `Dia encerrado: ${formatarHorasCurto(dia.trabalhadoMin)}`, detalhe };
  }
  if (m.almoco && !m.volta) {
    const volta = minParaHora(horaParaMin(m.almoco) + (esc.almocoMin || 60));
    return { estado: "almoco", titulo: `No almoço desde ${m.almoco}`, detalhe: `Volte às ${volta}.` };
  }
  const prevista = saidaPrevista(esc, m);
  const falta = dia.previstoMin - dia.trabalhadoMin;
  return {
    estado: "trabalhando",
    titulo: `Trabalhando há ${formatarHorasCurto(dia.trabalhadoMin)}`,
    detalhe:
      dia.previstoMin === 0
        ? "Hoje tudo conta como hora extra."
        : falta > 0
          ? `Saída prevista às ${prevista}.`
          : `Já passou ${formatarHorasCurto(-falta)} da jornada: conta como extra.`,
  };
}

// ---------- lembretes de ponto esquecido ----------

export interface Lembrete {
  id: "ontem-sem-saida" | "sem-entrada" | "sem-almoco" | "sem-saida";
  texto: string;
  /** Rótulo do botão de correção em um toque. */
  acao: string;
  data: string;
  marcacoes: Marcacoes;
}

const MARGEM = 60; // minutos de tolerância antes de lembrar

/** Pontos que parecem esquecidos, com a correção pronta (um toque). */
export function lembretesDoDia(p: {
  perfil: PerfilTrabalho;
  hoje: DiaRegistro | undefined;
  ontem: DiaRegistro | undefined;
  agora: Agora;
  feriadoHoje?: Feriado;
}): Lembrete[] {
  const { perfil, hoje, ontem, agora } = p;
  const res: Lembrete[] = [];
  const dataOntem = somarDias(agora.data, -1);

  if (ontem?.tipo === "normal" && ontem.marcacoes.entrada && !ontem.marcacoes.saida) {
    const prev = marcacoesPrevistas(escalaDoDia(perfil.escala, dataOntem));
    const hora = saidaPrevista(escalaDoDia(perfil.escala, dataOntem), ontem.marcacoes) ?? prev.saida ?? "17:00";
    const marcacoes: Marcacoes = { saida: hora };
    if (ontem.marcacoes.almoco && !ontem.marcacoes.volta && prev.volta) marcacoes.volta = prev.volta;
    res.push({ id: "ontem-sem-saida", texto: `Ontem (${seloDia(dataOntem)}) ficou sem a saída.`, acao: `Marcar saída às ${hora}`, data: dataOntem, marcacoes });
  }

  const tipo = hoje?.tipo ?? "normal";
  if (tipo !== "normal" || p.feriadoHoje) return res;
  const esc = escalaDoDia(perfil.escala, agora.data);
  if (!esc.trabalha) return res;
  const m = hoje?.marcacoes ?? {};
  const prev = marcacoesPrevistas(esc);

  if (!m.entrada && prev.entrada && agora.minutos > horaParaMin(prev.entrada) + MARGEM) {
    res.push({ id: "sem-entrada", texto: `Esqueceu de bater a entrada? Ela era às ${prev.entrada}.`, acao: `Bater entrada às ${prev.entrada}`, data: agora.data, marcacoes: { entrada: prev.entrada } });
    return res;
  }
  if (m.entrada && !m.almoco && !m.saida && prev.almoco && prev.volta && agora.minutos > horaParaMin(prev.volta) + MARGEM) {
    res.push({ id: "sem-almoco", texto: `Não registrou o almoço. Foi das ${prev.almoco} às ${prev.volta}?`, acao: `Marcar almoço ${prev.almoco}–${prev.volta}`, data: agora.data, marcacoes: { almoco: prev.almoco, volta: prev.volta } });
  }
  const prevista = saidaPrevista(esc, m);
  const emAberto = m.entrada && !m.saida && (!m.almoco || m.volta);
  if (emAberto && prevista && agora.minutos > horaParaMin(prevista) + MARGEM) {
    res.push({ id: "sem-saida", texto: `Ainda trabalhando? A saída prevista era às ${prevista}.`, acao: `Marcar saída às ${prevista}`, data: agora.data, marcacoes: { saida: prevista } });
  }
  return res;
}

// ---------- pendências do período ----------

export interface Pendencia {
  data: string;
  motivo: "sem-saida" | "sem-registro";
  texto: string;
}

/** Dias que precisam de atenção (antes de hoje): sem saída ou dia de trabalho sem registro. */
export function pendenciasDoPeriodo(dias: DiaAnalise[], hoje: string): Pendencia[] {
  const res: Pendencia[] = [];
  for (const d of dias) {
    if (d.data >= hoje) continue;
    if (d.incompleto) res.push({ data: d.data, motivo: "sem-saida", texto: `${seloDia(d.data)}: falta a saída` });
    else if (!d.registrado && d.escala.trabalha && !d.feriado) res.push({ data: d.data, motivo: "sem-registro", texto: `${seloDia(d.data)}: sem registro` });
  }
  return res;
}

// ---------- validação dos horários ----------

/** Avisos sobre horários que parecem errados (não bloqueia: só alerta). */
export function validarMarcacoes(m: Marcacoes): string[] {
  const avisos: string[] = [];
  if (m.almoco && !m.entrada) avisos.push("Falta a entrada.");
  if (m.volta && !m.almoco) avisos.push("Falta a saída para o almoço.");
  if (m.almoco && m.saida && !m.volta) avisos.push("Falta a volta do almoço.");
  const ints = intervalosTrabalho(m);
  if (ints.length) {
    const inicio = ints[0]!.inicio;
    const fim = ints[ints.length - 1]!.fim;
    if (fim - inicio > 16 * 60) avisos.push("O dia passou de 16 horas. Confira os horários.");
    if (ints.length === 2 && ints[1]!.inicio - ints[0]!.fim > 4 * 60) avisos.push("O almoço passou de 4 horas. Confira os horários.");
    if (somaIntervalos(ints) === 0 && m.saida) avisos.push("A entrada e a saída estão no mesmo horário.");
  }
  return avisos;
}

// ---------- ganho por dia (gráfico) ----------

export interface GanhoDia {
  data: string;
  normal: number;
  extra: number;
  total: number;
}

/** Ganho bruto de cada dia, numa passada só (cada dia olha só os próprios registros). */
export function ganhosPorDia(e: Omit<EntradaPeriodo, "modo" | "proporcionalAte">): GanhoDia[] {
  const regs = new Map((e.registros ?? []).map((r) => [r.data, r]));
  const lancs = new Map<string, NonNullable<EntradaPeriodo["lancamentos"]>>();
  for (const l of e.lancamentos ?? []) {
    if (!lancs.has(l.data)) lancs.set(l.data, []);
    lancs.get(l.data)!.push(l);
  }
  return datasDoPeriodo(e.periodo).map((data) => {
    const reg = regs.get(data);
    const r = calcularPeriodo({
      perfil: e.perfil,
      periodo: { inicio: data, fim: data },
      registros: reg ? [reg] : [],
      lancamentos: lancs.get(data) ?? [],
      itens: e.itens,
      feriadosLocais: e.feriadosLocais,
      agora: e.agora,
      modo: "dia",
    });
    const extra = r.ganhos.filter((l) => l.tipo === "extra").reduce((t, l) => t + l.valor, 0);
    return { data, normal: r.bruto - extra, extra, total: r.bruto };
  });
}
