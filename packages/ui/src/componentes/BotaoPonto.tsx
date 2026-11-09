"use client";

import type { Etapa } from "@ponto-pro/core";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, CloudOff, Hammer, LoaderCircle, LogIn, LogOut, Utensils } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "../cx";

const ETAPAS: Record<Etapa, { rotulo: string; icone: LucideIcon }> = {
  entrada: { rotulo: "Bater entrada", icone: LogIn },
  almoco: { rotulo: "Sair para o almoço", icone: Utensils },
  volta: { rotulo: "Voltar do almoço", icone: Hammer },
  saida: { rotulo: "Bater saída", icone: LogOut },
};

export interface BotaoPontoProps {
  /** Próxima marcação do dia. null = dia encerrado. */
  etapa: Etapa | null;
  /** Horário que será registrado ("09:41"). */
  hora: string;
  offline?: boolean;
  carregando?: boolean;
  /** Mensagem de erro (ex.: falha ao salvar). */
  erro?: string;
  /** Aviso neutro (ex.: pedir confirmação de um toque repetido). */
  aviso?: string;
  /** Toca um bipe curto ao bater. */
  som?: boolean;
  onBater?: () => void;
}

function bipe() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = 880;
    ganho.gain.value = 0.08;
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* sem áudio: segue só com vibração */
  }
}

/** Botão gigante de bater o ponto. O texto muda com a etapa do dia. */
export function BotaoPonto({ etapa, hora, offline, carregando, erro, aviso, som, onBater }: BotaoPontoProps) {
  const [confirmado, setConfirmado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const encerrado = etapa === null;
  const info = encerrado ? { rotulo: "Dia encerrado", icone: CircleCheck } : ETAPAS[etapa];
  const Icone = info.icone;

  // O check animado aparece quando a marcação foi salva de verdade (a etapa avançou),
  // não a cada toque. Assim um toque que só pede confirmação não engana.
  const etapaAnterior = useRef(etapa);
  useEffect(() => {
    const antes = etapaAnterior.current;
    etapaAnterior.current = etapa;
    if (antes === etapa || antes === null) return;
    if (som) bipe();
    setConfirmado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setConfirmado(false), 1200);
  }, [etapa, som]);

  function bater() {
    if (encerrado || carregando) return;
    navigator.vibrate?.(35);
    onBater?.();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={bater}
        disabled={encerrado || carregando}
        aria-busy={carregando || undefined}
        aria-label={encerrado ? "Dia encerrado" : `${info.rotulo} às ${hora}`}
        className={cx(
          "relative flex min-h-[72px] w-full items-center gap-3 overflow-hidden rounded-full pl-3 pr-6 text-left font-bold select-none transition-[transform,background-color] duration-150",
          encerrado
            ? "bg-superficie-2 text-texto-2 borda"
            : "sombra-botao bg-primaria text-sobre-primaria active:scale-[0.98] active:bg-primaria-forte",
          erro && !encerrado && "ring-4 ring-erro",
        )}
      >
        {!encerrado && (
          <span aria-hidden className="brilho-botao pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/14 to-transparent" />
        )}
        <span aria-hidden className={cx("relative flex size-11 shrink-0 items-center justify-center rounded-full", encerrado ? "bg-superficie" : "bg-white/16")}>
        {carregando ? (
          <LoaderCircle aria-hidden className="size-7 shrink-0 animate-spin" strokeWidth={2.25} />
        ) : (
          <Icone aria-hidden className="size-6 shrink-0" strokeWidth={2.25} />
        )}
        </span>
        <span className="flex flex-1 flex-col py-2 leading-tight">
          <span className="text-20">{info.rotulo}</span>
          {!encerrado && (
            <span className="numeros text-15 font-normal" aria-hidden>
              Registra às <b className="font-bold">{hora}</b>
            </span>
          )}
        </span>
        {confirmado && (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center gap-3 bg-sucesso text-white animate-entrar"
          >
            <svg viewBox="0 0 24 24" className="size-9 animate-check" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path className="check-traco" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span className="text-20">Registrado</span>
          </span>
        )}
      </button>
      {erro ? (
        <p role="alert" className="text-center text-15 font-bold text-erro-texto">{erro}</p>
      ) : aviso ? (
        <p role="status" className="text-center text-15 font-bold text-extra-texto">{aviso}</p>
      ) : offline ? (
        <p className="flex items-center justify-center gap-2 text-15 text-texto-2">
          <CloudOff aria-hidden className="size-5" /> Salvo no celular
        </p>
      ) : null}
    </div>
  );
}
