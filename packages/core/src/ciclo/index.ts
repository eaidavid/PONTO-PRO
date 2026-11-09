import { dataCurta, datasEntre, montarIso, somarDias, ultimoDiaDoMes } from "../tempo";

export interface Periodo {
  inicio: string;
  fim: string;
}

function fechamentoNoMes(ano: number, mes: number, diaFechamento: number): string {
  return montarIso(ano, mes, Math.min(diaFechamento, ultimoDiaDoMes(ano, mes)));
}

/**
 * Período (ciclo) que contém a data.
 * Fechamento no dia 20: 21/10 a 20/11. O dia 20/10 pertence ao período anterior.
 * Dia 31 (ou maior que o mês) fecha no último dia do mês.
 */
export function periodoDaData(data: string, diaFechamento: number): Periodo {
  const ano = Number(data.slice(0, 4));
  const mes = Number(data.slice(5, 7));
  const fechaEsteMes = fechamentoNoMes(ano, mes, diaFechamento);
  let fim: string;
  if (data <= fechaEsteMes) fim = fechaEsteMes;
  else fim = mes === 12 ? fechamentoNoMes(ano + 1, 1, diaFechamento) : fechamentoNoMes(ano, mes + 1, diaFechamento);
  const fimAno = Number(fim.slice(0, 4));
  const fimMes = Number(fim.slice(5, 7));
  const anterior =
    fimMes === 1 ? fechamentoNoMes(fimAno - 1, 12, diaFechamento) : fechamentoNoMes(fimAno, fimMes - 1, diaFechamento);
  return { inicio: somarDias(anterior, 1), fim };
}

/** Período anterior (-1) ou seguinte (+1). */
export function periodoVizinho(p: Periodo, direcao: -1 | 1, diaFechamento: number): Periodo {
  return periodoDaData(direcao === -1 ? somarDias(p.inicio, -1) : somarDias(p.fim, 1), diaFechamento);
}

export function datasDoPeriodo(p: Periodo): string[] {
  return datasEntre(p.inicio, p.fim);
}

/** "21/10 a 20/11" */
export function rotuloPeriodo(p: Periodo): string {
  return `${dataCurta(p.inicio)} a ${dataCurta(p.fim)}`;
}
