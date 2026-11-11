"use client";

import { agoraEmSaoPaulo, type Recurso, pode, type SituacaoPlano, situacaoDoPlano } from "@ponto-pro/core";
import type { Estado } from "./estado";

/** Plano que vale hoje para esta pessoa. */
export function situacaoAtual(estado: Estado): SituacaoPlano & { pode: (r: Recurso) => boolean } {
  const hoje = agoraEmSaoPaulo().data;
  const s = situacaoDoPlano({ assinatura: estado.assinatura, inicioUso: estado.inicioUso ?? hoje, hoje });
  return { ...s, pode: (r) => pode(s.plano, r) };
}
