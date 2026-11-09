import type { Periodo } from "../ciclo";
import { feriadosDoIntervalo } from "../feriados";
import type { PerfilTrabalho } from "../schema/perfil";
import type { Feriado } from "../schema/registro";
import { diaDaSemana, diasEntre, montarIso, somarDias, ultimoDiaDoMes } from "../tempo";

/**
 * Quando o dinheiro do período "pinga".
 * Sem configuração: quinto dia útil do mês seguinte ao fechamento (regra comum na CLT,
 * mostrada como sugestão). Dia útil = segunda a sábado sem feriado (como a CLT conta).
 */
export function dataDePagamento(perfil: PerfilTrabalho, periodo: Periodo, feriadosLocais: Feriado[] = []): string {
  const regra = perfil.diaPagamento ?? { tipo: "quinto-dia-util" as const };
  if (regra.tipo === "no-fechamento") return periodo.fim;
  const ano = Number(periodo.fim.slice(0, 4));
  const mes = Number(periodo.fim.slice(5, 7));
  const [a2, m2] = mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
  if (regra.tipo === "dia-fixo") {
    // dia fixo: no mesmo mês se ainda não passou do fechamento, senão no mês seguinte
    const noMes = montarIso(ano, mes, Math.min(regra.dia, ultimoDiaDoMes(ano, mes)));
    return noMes >= periodo.fim ? noMes : montarIso(a2, m2, Math.min(regra.dia, ultimoDiaDoMes(a2, m2)));
  }
  const inicio = montarIso(a2, m2, 1);
  const feriados = feriadosDoIntervalo(inicio, montarIso(a2, m2, ultimoDiaDoMes(a2, m2)), feriadosLocais);
  let uteis = 0;
  let d = inicio;
  for (;;) {
    if (diaDaSemana(d) !== 0 && !feriados.has(d)) uteis++;
    if (uteis === 5) return d;
    d = somarDias(d, 1);
  }
}

/** "hoje", "amanhã", "em 26 dias", "há 3 dias". */
export function quandoFalta(hoje: string, data: string): string {
  const n = diasEntre(hoje, data);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n > 1) return `em ${n} dias`;
  return n === -1 ? "ontem" : `há ${-n} dias`;
}
