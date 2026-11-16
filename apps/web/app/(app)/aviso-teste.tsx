"use client";

import { DIAS_TESTE, formatarDuracao, formatarReais } from "@ponto-pro/core";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { Estado } from "../../lib/estado";
import { medir } from "../../lib/medir";
import { momentoDoTeste, resumoDoTeste, situacaoAtual } from "../../lib/plano";

/**
 * Aviso do fim do teste grátis, na tela Hoje: aparece nos 3 últimos dias e nos 3 primeiros depois.
 * Mostra o que a pessoa já registrou, para ela decidir com os números dela.
 */
export function AvisoTeste({ estado, hoje }: { estado: Estado; hoje: string }) {
  const momento = momentoDoTeste(estado, hoje);
  const resumo = useMemo(() => (momento ? resumoDoTeste(estado, hoje) : null), [momento, estado, hoje]);
  if (!momento) return null;
  const s = situacaoAtual(estado);

  const quando = momento === "acabou" ? "Seu teste do Pro acabou." : s.diasDeTeste === 1 ? "Seu teste do Pro acaba amanhã." : `Seu teste do Pro acaba em ${s.diasDeTeste} dias.`;
  const feito =
    resumo && resumo.horasMin > 0
      ? `Em ${DIAS_TESTE} dias você registrou ${formatarDuracao(resumo.horasMin)}${resumo.extraMin > 0 ? `, com ${formatarDuracao(resumo.extraMin)} de hora extra (${formatarReais(resumo.extraValor)})` : ""}.`
      : null;
  const depois = momento === "acabou" ? "Você continua no Grátis, com o ponto, o valor do mês e a conferência do pagamento." : "Se não assinar, você continua no Grátis sem perder nada.";

  return (
    <section role="status" aria-label="Teste grátis" className="flex flex-col gap-3 rounded-[20px] bg-primaria-suave p-4">
      <p className="flex gap-2 text-17">
        <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primaria-forte" />
        <span>
          <b>{quando}</b> {feito} {depois}
        </span>
      </p>
      <Link
        href="/planos"
        onClick={() => medir("oferta_pro", { origem: `teste-${momento}` })}
        className="inline-flex min-h-12 items-center justify-center self-start rounded-full bg-primaria px-5 text-17 font-bold text-sobre-primaria"
      >
        Ver o Pro
      </Link>
    </section>
  );
}
