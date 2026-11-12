"use client";

import { type Etapa, formatarReais, type Marcacoes } from "@ponto-pro/core";
import { BotaoPonto, EtapasDoDia, ValorDinheiro } from "@ponto-pro/ui";
import { RotateCcw, Wallet } from "lucide-react";
import { useState } from "react";

/** Um dia de exemplo: 07:00 às 17:00 com 1h de almoço, a R$ 25,00 por hora. */
const PASSOS: { etapa: Etapa | null; hora: string; marcacoes: Marcacoes; ganho: number; estado: string }[] = [
  { etapa: "entrada", hora: "07:00", marcacoes: {}, ganho: 0, estado: "Antes de começar" },
  { etapa: "almoco", hora: "12:00", marcacoes: { entrada: "07:00" }, ganho: 12500, estado: "Trabalhando" },
  { etapa: "volta", hora: "13:00", marcacoes: { entrada: "07:00", almoco: "12:00" }, ganho: 12500, estado: "No almoço" },
  { etapa: "saida", hora: "17:00", marcacoes: { entrada: "07:00", almoco: "12:00", volta: "13:00" }, ganho: 22500, estado: "Trabalhando" },
  { etapa: null, hora: "17:00", marcacoes: { entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:00" }, ganho: 22500, estado: "Dia encerrado" },
];

/**
 * A tela Hoje em miniatura, com os componentes de verdade do app.
 * Cada toque bate uma etapa e o relógio pula para a próxima: dá para sentir o "bateu o ponto, pingou".
 */
export function DemoPonto() {
  const [i, setI] = useState(0);
  const passo = PASSOS[i]!;
  const fim = passo.etapa === null;

  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3">
      <div
        role="group"
        aria-label="Demonstração do Pingou"
        className="overflow-hidden rounded-[40px] border-[8px] border-[#0a100e] bg-fundo text-texto shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/25"
      >
        <div className="fundo-marca flex flex-col px-5 pt-5 pb-11">
          <p className="text-15 font-bold">Bom dia, José</p>
          <p className="display pt-2 text-[3.7rem] leading-[0.95]" aria-label={`No exemplo, são ${passo.hora}`}>
            {passo.hora}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-white/14 py-1.5 pr-4 pl-3 text-15 font-bold">
            <span aria-hidden className={passo.estado === "Trabalhando" ? "size-2.5 animate-pulse rounded-full bg-marca-destaque" : "size-2.5 rounded-full bg-white/70"} />
            {passo.estado}
          </p>
        </div>

        <div className="relative -mt-7 flex flex-col gap-3 rounded-t-painel bg-fundo px-3 pt-3 pb-4">
          <div className="cartao px-1 py-3">
            <EtapasDoDia marcacoes={passo.marcacoes} etapaAtual={passo.etapa} />
          </div>

          <BotaoPonto etapa={passo.etapa} hora={passo.hora} mostrarHora={false} onBater={() => setI((n) => Math.min(n + 1, PASSOS.length - 1))} />

          <div className="cartao flex min-h-16 items-center gap-3 px-4 py-2">
            <Wallet aria-hidden className="size-5 shrink-0 text-texto-2" />
            <span className="flex-1 text-17 font-bold">Ganho hoje</span>
            <span key={passo.ganho} className="animate-entrar" aria-live="polite">
              <ValorDinheiro centavos={passo.ganho} />
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-12 items-center justify-center text-center text-15 text-sobre-marca-2">
        {fim ? (
          <button
            type="button"
            onClick={() => setI(0)}
            className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-bold text-sobre-marca underline decoration-white/50 underline-offset-4 active:bg-white/10"
          >
            <RotateCcw aria-hidden className="size-5" />
            Pingou {formatarReais(passo.ganho)} no dia. Ver de novo
          </button>
        ) : (
          <p>
            {i === 0 ? "Toque no botão e veja o dinheiro subir." : "Continue tocando até o fim do dia."} Exemplo com R$ 25,00 por hora.
          </p>
        )}
      </div>
    </div>
  );
}
