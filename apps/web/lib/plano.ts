"use client";

import { agoraEmSaoPaulo, calcularPeriodo, DIAS_TESTE, diasEntre, type Recurso, pode, type SituacaoPlano, situacaoDoPlano } from "@ponto-pro/core";
import type { Estado } from "./estado";

/** Plano que vale hoje para esta pessoa. */
export function situacaoAtual(estado: Estado): SituacaoPlano & { pode: (r: Recurso) => boolean } {
  const hoje = agoraEmSaoPaulo().data;
  const s = situacaoDoPlano({ assinatura: estado.assinatura, inicioUso: estado.inicioUso ?? hoje, hoje });
  return { ...s, pode: (r) => pode(s.plano, r) };
}

/** O que a pessoa registrou desde o começo do teste: horas, hora extra e quanto a extra vale. */
export function resumoDoTeste(estado: Estado, hoje: string): { horasMin: number; extraMin: number; extraValor: number } | null {
  if (!estado.perfil || !estado.inicioUso || estado.inicioUso > hoje) return null;
  const r = calcularPeriodo({
    perfil: estado.perfil,
    periodo: { inicio: estado.inicioUso, fim: hoje },
    registros: estado.registros.filter((x) => x.data >= estado.inicioUso! && x.data <= hoje),
    lancamentos: estado.lancamentos,
    itens: estado.itens,
    feriadosLocais: estado.feriadosLocais,
    modo: "dia",
  });
  const extraValor = r.ganhos.filter((l) => l.tipo === "extra").reduce((t, l) => t + l.valor, 0);
  return { horasMin: r.horas.trabalhadoMin, extraMin: r.horas.extraMin, extraValor };
}

/** Em que momento do teste a pessoa está, para o aviso da tela Hoje. */
export function momentoDoTeste(estado: Estado, hoje: string): "acabando" | "acabou" | null {
  const s = situacaoDoPlano({ assinatura: estado.assinatura, inicioUso: estado.inicioUso ?? hoje, hoje });
  if (s.emTeste) return s.diasDeTeste <= 3 ? "acabando" : null;
  if (estado.assinatura || !estado.inicioUso) return null;
  const desde = diasEntre(estado.inicioUso, hoje) - DIAS_TESTE;
  return desde >= 0 && desde < 3 ? "acabou" : null;
}
