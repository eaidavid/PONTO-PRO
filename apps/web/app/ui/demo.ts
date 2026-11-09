import {
  type Agora,
  calcularPeriodo,
  calcularPrevisao,
  datasEntre,
  escalaDoDia,
  type DiaRegistro,
  ganhoDoDia,
  itensDosPacotes,
  type LancamentoProducao,
  marcacoesPrevistas,
  MODELOS,
  periodoDaData,
} from "@ponto-pro/core";

/** Dados de exemplo do brief: José, pedreiro, R$ 25,00/h, período 21/10 a 20/11. */
export const HOJE = "2026-11-09";
export const AGORA: Agora = { data: HOJE, minutos: 9 * 60 + 41, hora: "09:41" };

export const perfil = (() => {
  const p = MODELOS.construcao.perfil("2026-11-09T09:41:00-03:00");
  p.nome = "Obra Jardim";
  return p;
})();

export const periodo = periodoDaData(HOJE, perfil.ciclo.diaFechamento);
export const itens = itensDosPacotes(perfil.producao.pacotes);

const especiais: Record<string, Partial<DiaRegistro>> = {
  "2026-10-28": { tipo: "falta", marcacoes: {} },
  "2026-11-04": { marcacoes: { entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:30" } },
  "2026-10-31": { marcacoes: { entrada: "07:00", saida: "12:00" } },
};

export const registros: DiaRegistro[] = datasEntre(periodo.inicio, "2026-11-08").flatMap((data) => {
  const esp = especiais[data];
  if (esp) return [{ data, tipo: "normal", marcacoes: {}, ...esp } as DiaRegistro];
  const esc = escalaDoDia(perfil.escala, data);
  if (!esc.trabalha || data === "2026-11-02") return [];
  return [{ data, tipo: "normal", marcacoes: marcacoesPrevistas(esc) }];
});

export const lancamentos: LancamentoProducao[] = [
  { id: "l1", data: "2026-11-05", itemId: "construcao.externos.1", quantidade: 50, precoUnitario: 1200 },
];

export function calcular(marcacoesHoje: DiaRegistro["marcacoes"]) {
  const todos = [...registros, { data: HOJE, tipo: "normal" as const, marcacoes: marcacoesHoje }];
  const base = { perfil, periodo, registros: todos, itens, lancamentos, agora: AGORA };
  return {
    previsao: calcularPrevisao({ ...base, hoje: HOJE }),
    hoje: ganhoDoDia({ perfil, data: HOJE, registros: todos, agora: AGORA }),
    lista: calcularPeriodo({ ...base, periodo: { inicio: periodo.inicio, fim: HOJE } }),
  };
}
