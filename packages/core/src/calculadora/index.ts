import { arredondar } from "../dinheiro";
import { horaParaMin } from "../tempo";

/**
 * Calculadora rápida (tela "Calculadora"): contas soltas, sem depender do perfil salvo.
 * Dinheiro em centavos e tempo em minutos, como no resto do motor.
 */

/** Divisor sugerido para quem trabalha 44h por semana (CLT). */
export const DIVISOR_PADRAO = 220;

/** Divisor de horas do mês a partir das horas da semana (44h → 220, 40h → 200, 36h → 180). */
export function divisorDaSemana(horasSemana: number): number {
  return Math.round(horasSemana * 5);
}

export interface ValorDaHora {
  /** Valor da hora normal (centavos). */
  hora: number;
  /** Hora extra em dia comum (+50% ou o percentual informado). */
  extra: number;
  /** Hora em domingo e feriado (+100% ou o percentual informado). */
  extraDomingo: number;
}

/** Salário mensal → valor da hora e da hora extra. */
export function valorDaHoraDoSalario(salario: number, divisor = DIVISOR_PADRAO, pctExtra = 50, pctDomingo = 100): ValorDaHora {
  if (salario <= 0 || divisor <= 0) return { hora: 0, extra: 0, extraDomingo: 0 };
  const hora = arredondar(salario / divisor);
  return {
    hora,
    extra: arredondar((salario / divisor) * (1 + pctExtra / 100)),
    extraDomingo: arredondar((salario / divisor) * (1 + pctDomingo / 100)),
  };
}

export interface ContaDoDia {
  /** Minutos trabalhados no dia (sem o almoço). */
  trabalhadoMin: number;
  /** Minutos acima da jornada. */
  extraMin: number;
  /** Minutos dentro da jornada. */
  normalMin: number;
  /** Valor do dia (centavos): normal + extra com o adicional. */
  valor: number;
}

/**
 * Entrada, saída e almoço → horas e valor do dia.
 * Saída antes da entrada conta como virada da meia-noite (plantão noturno).
 */
export function contaDoDia(p: { entrada: string; saida: string; almocoMin: number; jornadaMin: number; valorHora: number; pctExtra?: number }): ContaDoDia {
  const ent = horaParaMin(p.entrada);
  let sai = horaParaMin(p.saida);
  if (sai < ent) sai += 24 * 60;
  const trabalhadoMin = Math.max(0, sai - ent - Math.max(0, p.almocoMin));
  const normalMin = Math.min(trabalhadoMin, Math.max(0, p.jornadaMin));
  const extraMin = trabalhadoMin - normalMin;
  const pct = p.pctExtra ?? 50;
  const valor = arredondar((p.valorHora * normalMin) / 60 + (p.valorHora * (1 + pct / 100) * extraMin) / 60);
  return { trabalhadoMin, extraMin, normalMin, valor };
}
