import { TZDate } from "@date-fns/tz";
import type { Marcacoes } from "../schema/registro";

export const FUSO = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

// ---------- horários ----------

/** "07:30" -> 450 */
export function horaParaMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 450 -> "07:30" (aceita valores acima de 24h, volta ao relógio). */
export function minParaHora(min: number): string {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

/** Duração em minutos -> "9h00", "2h39", "0h30". Negativos com sinal. */
export function formatarDuracao(min: number, opcoes: { sinal?: boolean } = {}): string {
  const neg = min < 0;
  const abs = Math.abs(Math.round(min));
  const txt = `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}`;
  if (neg) return `-${txt}`;
  return opcoes.sinal && abs > 0 ? `+${txt}` : txt;
}

/** Duração curta para frases: 540 -> "9h", 150 -> "2h30". */
export function formatarHorasCurto(min: number): string {
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${min < 0 ? "-" : ""}${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

export interface Intervalo {
  inicio: number;
  fim: number;
}

/**
 * Converte as marcações em intervalos de trabalho (minutos a partir da 00:00 do dia).
 * Cada horário menor que o anterior soma 24h (turno que passa da meia-noite).
 * `agoraMin` fecha o intervalo em aberto (dia em andamento).
 */
export function intervalosTrabalho(m: Marcacoes, agoraMin?: number): Intervalo[] {
  const ordem = [m.entrada, m.almoco, m.volta, m.saida];
  const vals: (number | undefined)[] = [];
  let ultimo = -1;
  for (const h of ordem) {
    if (!h) {
      vals.push(undefined);
      continue;
    }
    let v = horaParaMin(h);
    while (v < ultimo) v += 1440;
    vals.push(v);
    ultimo = v;
  }
  const [e, a, v, s] = vals;
  const ajustarAgora = (inicio: number) => {
    if (agoraMin === undefined) return undefined;
    let fim = agoraMin;
    while (fim < inicio) fim += 1440;
    return fim;
  };
  const res: Intervalo[] = [];
  if (e === undefined) return res;
  if (a !== undefined) {
    res.push({ inicio: e, fim: a });
    if (v !== undefined) {
      const fim = s ?? ajustarAgora(v);
      if (fim !== undefined) res.push({ inicio: v, fim });
    }
  } else if (s !== undefined) {
    res.push({ inicio: e, fim: s });
  } else {
    const fim = ajustarAgora(e);
    if (fim !== undefined) res.push({ inicio: e, fim });
  }
  return res;
}

export function somaIntervalos(ints: Intervalo[]): number {
  return ints.reduce((t, i) => t + Math.max(0, i.fim - i.inicio), 0);
}

/** Minutos dentro da janela noturna (ex.: 22:00 às 05:00). */
export function minutosNoturnos(ints: Intervalo[], inicio: string, fim: string): number {
  const ws = horaParaMin(inicio);
  const we = horaParaMin(fim);
  if (ws === we) return 0;
  const janelas: Intervalo[] = [];
  for (let k = -1; k <= 2; k++) {
    const base = k * 1440;
    janelas.push(ws < we ? { inicio: base + ws, fim: base + we } : { inicio: base + ws, fim: base + 1440 + we });
  }
  let total = 0;
  for (const i of ints) {
    for (const j of janelas) {
      total += Math.max(0, Math.min(i.fim, j.fim) - Math.max(i.inicio, j.inicio));
    }
  }
  return total;
}

/** Marcação que falta no dia, na ordem: entrada, almoço, volta, saída. */
export type Etapa = "entrada" | "almoco" | "volta" | "saida";
export function proximaEtapa(m: Marcacoes): Etapa | null {
  if (!m.entrada) return "entrada";
  if (m.saida) return null;
  if (!m.almoco) return "almoco";
  if (!m.volta) return "volta";
  return "saida";
}

// ---------- datas (texto ISO, sem fuso, aritmética em UTC) ----------

export function isoParaUTC(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function utcParaIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function somarDias(iso: string, dias: number): string {
  return utcParaIso(isoParaUTC(iso) + dias * DIA_MS);
}

/** Dias de `a` até `b` (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((isoParaUTC(b) - isoParaUTC(a)) / DIA_MS);
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(iso: string): number {
  return new Date(isoParaUTC(iso)).getUTCDay();
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function montarIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Lista de datas de `inicio` a `fim`, inclusive. */
export function datasEntre(inicio: string, fim: string): string[] {
  const n = diasEntre(inicio, fim);
  const res: string[] = [];
  for (let i = 0; i <= n; i++) res.push(somarDias(inicio, i));
  return res;
}

/** Domingo que inicia a semana da data. */
export function inicioDaSemana(iso: string): string {
  return somarDias(iso, -diaDaSemana(iso));
}

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-11-03" -> "ter 03" */
export function seloDia(iso: string): string {
  return `${DIAS_CURTOS[diaDaSemana(iso)]} ${iso.slice(8, 10)}`;
}

/** "2026-11-03" -> "03/11" */
export function dataCurta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "2026-11-09" -> "segunda, 09 de novembro" */
export function dataPorExtenso(iso: string): string {
  return `${DIAS_LONGOS[diaDaSemana(iso)]}, ${iso.slice(8, 10)} de ${MESES[Number(iso.slice(5, 7)) - 1]}`;
}

// ---------- agora no fuso de São Paulo ----------

export interface Agora {
  data: string;
  minutos: number;
  hora: string;
}

/** Data e hora atuais em America/Sao_Paulo, a partir de um instante. */
export function agoraEmSaoPaulo(instante: Date | number = Date.now()): Agora {
  const z = new TZDate(typeof instante === "number" ? instante : instante.getTime(), FUSO);
  const data = montarIso(z.getFullYear(), z.getMonth() + 1, z.getDate());
  const minutos = z.getHours() * 60 + z.getMinutes();
  return { data, minutos, hora: minParaHora(minutos) };
}

/** Saudação pelo horário: "Bom dia", "Boa tarde", "Boa noite". */
export function saudacao(minutos: number): string {
  if (minutos >= 5 * 60 && minutos < 12 * 60) return "Bom dia";
  if (minutos >= 12 * 60 && minutos < 18 * 60) return "Boa tarde";
  return "Boa noite";
}
