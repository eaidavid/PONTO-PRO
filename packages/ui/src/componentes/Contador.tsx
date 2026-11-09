"use client";

import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

export interface ContadorProps {
  rotulo: string;
  valor: ReactNode;
  /** Texto dos botões, ex.: "R$ 50", "5%", "1 dia". */
  passo: string;
  onMenos: () => void;
  onMais: () => void;
  podeMenos?: boolean;
  podeMais?: boolean;
  grande?: boolean;
}

/** Valor com botões grandes de − e +. Sem digitar. */
export function Contador({ rotulo, valor, passo, onMenos, onMais, podeMenos = true, podeMais = true, grande }: ContadorProps) {
  const btn = "inline-flex min-h-14 items-center justify-center gap-1.5 rounded-full bg-superficie-2 px-4 text-17 font-bold borda active:scale-[0.97] disabled:opacity-40";
  return (
    <div className="flex flex-col gap-3">
      <span className="text-15 font-bold text-texto-2">{rotulo}</span>
      <output aria-live="polite" className={grande ? "display text-center text-44" : "display text-center text-32"}>{valor}</output>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={btn} onClick={onMenos} disabled={!podeMenos} aria-label={`Menos ${passo}`}>
          <Minus aria-hidden className="size-5" strokeWidth={2.5} /> {passo}
        </button>
        <button type="button" className={btn} onClick={onMais} disabled={!podeMais} aria-label={`Mais ${passo}`}>
          <Plus aria-hidden className="size-5" strokeWidth={2.5} /> {passo}
        </button>
      </div>
    </div>
  );
}
