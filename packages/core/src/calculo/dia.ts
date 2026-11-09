import { escalaDoDia } from "../escala";
import type { DiaEscala, PerfilTrabalho } from "../schema/perfil";
import type { DiaRegistro, Feriado, TipoDia } from "../schema/registro";
import { diaDaSemana, intervalosTrabalho, minutosNoturnos, somaIntervalos } from "../tempo";

export type CategoriaDia = "util" | "sabado" | "domingo" | "feriado";

/** Leitura de um dia, antes de olhar a semana e o período. Tudo em minutos. */
export interface DiaAnalise {
  data: string;
  categoria: CategoriaDia;
  feriado?: string;
  tipo: TipoDia;
  registrado: boolean;
  /** Tem entrada mas falta fechar o dia (e não está em andamento). */
  incompleto: boolean;
  emAndamento: boolean;
  escala: DiaEscala;
  /** Horas que o dia deveria ter (0 em folga, feriado e atestado). */
  previstoMin: number;
  trabalhadoMin: number;
  noturnoMin: number;
  /** Trabalhado dentro do previsto. */
  normalMin: number;
  /** Acima do previsto e até o limite diário (pode ser compensado na semana). */
  excedenteMin: number;
  /** Acima do limite diário: sempre hora extra. */
  acimaLimiteMin: number;
  /** Trabalho em folga ou feriado: sempre hora extra na categoria do dia. */
  foraEscalaMin: number;
  /** Faltou para o previsto (dia fechado ou falta). */
  deficitMin: number;
  /** Horas pagas sem trabalhar (feriado abonado ou atestado). */
  abonoMin: number;
  motivoAbono?: "feriado" | "atestado";
  /** Horas que saem do saldo (dia compensado). */
  debitoBancoMin: number;
}

export interface OpcoesDia {
  /** Minutos do relógio agora, para fechar o intervalo em aberto de hoje. */
  agoraMin?: number;
}

function categoriaDe(data: string, ehFeriado: boolean): CategoriaDia {
  if (ehFeriado) return "feriado";
  const d = diaDaSemana(data);
  if (d === 0) return "domingo";
  if (d === 6) return "sabado";
  return "util";
}

export function analisarDia(
  perfil: PerfilTrabalho,
  data: string,
  registro: DiaRegistro | undefined,
  feriado: Feriado | undefined,
  opcoes: OpcoesDia = {},
): DiaAnalise {
  const escala = escalaDoDia(perfil.escala, data);
  const tipo: TipoDia = registro?.tipo ?? "normal";
  const ehFeriado = !!feriado || tipo === "feriado";
  const categoria = categoriaDe(data, ehFeriado);
  const m = registro?.marcacoes ?? {};
  const contaTrabalho = tipo !== "falta" && tipo !== "atestado";
  const ints = contaTrabalho ? intervalosTrabalho(m, opcoes.agoraMin) : [];
  const trabalhadoMin = somaIntervalos(ints);
  const noturno = perfil.adicionais.noturno;
  const noturnoMin = noturno.ativo ? minutosNoturnos(ints, noturno.inicio, noturno.fim) : 0;
  const temEntrada = contaTrabalho && !!m.entrada;
  const fechado = !!m.saida;
  const emAndamento = temEntrada && !fechado && opcoes.agoraMin !== undefined;
  const incompleto = temEntrada && !fechado && !emAndamento;
  const horas = escala.trabalha ? escala.horasLiquidasMin : 0;

  const base: DiaAnalise = {
    data,
    categoria,
    tipo,
    registrado: !!registro,
    incompleto,
    emAndamento,
    escala,
    previstoMin: 0,
    trabalhadoMin,
    noturnoMin,
    normalMin: 0,
    excedenteMin: 0,
    acimaLimiteMin: 0,
    foraEscalaMin: 0,
    deficitMin: 0,
    abonoMin: 0,
    debitoBancoMin: 0,
  };
  if (ehFeriado) base.feriado = feriado?.nome ?? "Feriado";

  if (ehFeriado) {
    base.foraEscalaMin = trabalhadoMin;
    if (perfil.adicionais.feriadoTrabalhado.abonaDia && horas > 0) {
      base.abonoMin = horas;
      base.motivoAbono = "feriado";
    }
    return base;
  }
  switch (tipo) {
    case "atestado":
      if (horas > 0) {
        base.abonoMin = horas;
        base.motivoAbono = "atestado";
      }
      return base;
    case "falta":
      base.previstoMin = horas;
      base.deficitMin = horas;
      return base;
    case "folga":
      base.foraEscalaMin = trabalhadoMin;
      return base;
    case "compensado":
      base.foraEscalaMin = trabalhadoMin;
      base.debitoBancoMin = horas;
      return base;
    default:
      break;
  }
  if (!escala.trabalha) {
    base.foraEscalaMin = trabalhadoMin;
    return base;
  }
  const limite = Math.max(perfil.jornada.limiteDiarioMin, horas);
  base.previstoMin = horas;
  base.normalMin = Math.min(trabalhadoMin, horas);
  base.acimaLimiteMin = Math.max(0, trabalhadoMin - limite);
  base.excedenteMin = Math.max(0, trabalhadoMin - horas) - base.acimaLimiteMin;
  base.deficitMin = fechado ? Math.max(0, horas - trabalhadoMin) : 0;
  return base;
}

/** Saldo do dia para a lista de registros: trabalhado + abono − previsto. */
export function saldoDoDia(d: DiaAnalise): number {
  if (d.emAndamento || d.incompleto) return 0;
  if (!d.registrado && d.trabalhadoMin === 0 && d.tipo === "normal") return 0;
  return d.trabalhadoMin - d.previstoMin;
}
