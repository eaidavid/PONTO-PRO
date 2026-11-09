import { calcularPeriodo, type EntradaPeriodo, extratoDoPeriodo, type LinhaExtrato, type ResultadoPeriodo } from "../calculo/periodo";
import { datasDoPeriodo } from "../ciclo";
import { formatarReais } from "../dinheiro";
import { escalaDoDia, marcacoesPrevistas } from "../escala";
import { feriadosDoIntervalo } from "../feriados";
import type { DiaRegistro } from "../schema/registro";
import { formatarHorasCurto } from "../tempo";

export interface EntradaPrevisao extends Omit<EntradaPeriodo, "modo" | "proporcionalAte"> {
  /** Data de hoje (America/Sao_Paulo). */
  hoje: string;
}

export interface ResultadoPrevisao {
  /** Até hoje: "Já ganhou". */
  realizado: ResultadoPeriodo;
  /** Até o fechamento, cumprindo a escala: "Você deve receber". */
  previsto: ResultadoPeriodo;
  falta: {
    /** Centavos (líquido) entre o previsto e o realizado. */
    valor: number;
    /** Horas da escala que ainda faltam. */
    horasMin: number;
    /** Dias de trabalho que ainda faltam (inclui hoje se não terminou). */
    dias: number;
  };
  /** 0 a 1, para a barra de progresso. */
  progresso: number;
  extrato: LinhaExtrato[];
}

/** Previsão até o fechamento: o que já foi feito + o resto da escala como previsto. */
export function calcularPrevisao(e: EntradaPrevisao): ResultadoPrevisao {
  const { perfil, periodo, hoje } = e;
  const registros = (e.registros ?? []).filter((r) => r.data <= periodo.fim && r.data >= periodo.inicio);
  const realizado = calcularPeriodo({
    ...e,
    registros: registros.filter((r) => r.data <= hoje),
    lancamentos: e.lancamentos?.filter((l) => l.data <= hoje),
    proporcionalAte: hoje,
  });

  const porData = new Map(registros.map((r) => [r.data, r]));
  const feriados = feriadosDoIntervalo(periodo.inicio, periodo.fim, e.feriadosLocais);
  const projetados: DiaRegistro[] = [];
  let horasMin = 0;
  let dias = 0;
  for (const data of datasDoPeriodo(periodo)) {
    if (data < hoje) continue;
    const reg = porData.get(data);
    const esc = escalaDoDia(perfil.escala, data);
    const livre = !reg || (reg.tipo === "normal" && !reg.marcacoes.saida);
    if (!livre || !esc.trabalha || feriados.has(data)) continue;
    const jaFeito =
      data === hoje ? (realizado.dias.find((d) => d.data === hoje)?.trabalhadoMin ?? 0) : 0;
    if (jaFeito >= esc.horasLiquidasMin) continue;
    projetados.push({ data, tipo: "normal", marcacoes: marcacoesPrevistas(esc) });
    horasMin += esc.horasLiquidasMin - jaFeito;
    dias += 1;
  }
  const projetadosSet = new Set(projetados.map((p) => p.data));
  const previsto = calcularPeriodo({
    ...e,
    agora: undefined,
    registros: [...registros.filter((r) => !projetadosSet.has(r.data)), ...projetados],
  });

  const valor = Math.max(0, previsto.liquido - realizado.liquido);
  const progresso = previsto.liquido > 0 ? Math.min(1, Math.max(0, realizado.liquido / previsto.liquido)) : 0;
  const extrato: LinhaExtrato[] = [
    ...extratoDoPeriodo(previsto),
    {
      texto: `Previsão: faltam ${dias} ${dias === 1 ? "dia" : "dias"} e ${formatarHorasCurto(horasMin)} pela sua escala.`,
      tipo: "info",
    },
    { texto: `Já ganhou ${formatarReais(realizado.liquido)}. Falta ${formatarReais(valor)}.`, tipo: "info" },
  ];
  return { realizado, previsto, falta: { valor, horasMin, dias }, progresso, extrato };
}
