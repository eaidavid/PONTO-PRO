"use client";

import type { ReactNode } from "react";
import { cx } from "../cx";

export interface InterruptorProps {
  rotulo: string;
  descricao?: ReactNode;
  valor: boolean;
  onChange: (v: boolean) => void;
}

/** Linha com chave liga/desliga. A linha inteira é tocável e mostra "Sim"/"Não". */
export function Interruptor({ rotulo, descricao, valor, onChange }: InterruptorProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      onClick={() => onChange(!valor)}
      className="flex min-h-16 w-full items-center gap-4 py-2 text-left"
    >
      <span className="flex-1">
        <span className="block text-17 font-bold">{rotulo}</span>
        {descricao && <span className="block text-15 text-texto-2">{descricao}</span>}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-15 font-bold text-texto-2">{valor ? "Sim" : "Não"}</span>
        <span className={cx("relative h-8 w-14 rounded-full transition-colors duration-200", valor ? "bg-primaria" : "bg-borda-forte")}>
          <span className={cx("absolute top-1 size-6 rounded-full bg-white shadow transition-transform duration-200", valor ? "translate-x-7" : "translate-x-1")} />
        </span>
      </span>
    </button>
  );
}
