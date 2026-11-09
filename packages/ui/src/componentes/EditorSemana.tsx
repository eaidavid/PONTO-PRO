"use client";

import { formatarHorasCurto } from "@ponto-pro/core";
import { Minus, Plus } from "lucide-react";
import { cx } from "../cx";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export interface EditorSemanaProps {
  /** Minutos líquidos por dia, domingo a sábado. */
  minutos: number[];
  onChange: (dia: number, minutos: number) => void;
  /** Passo dos botões (padrão 30 min). */
  passo?: number;
  max?: number;
}

/** Barras por dia, ajustadas com + e −. Mostra o total da semana. */
export function EditorSemana({ minutos, onChange, passo = 30, max = 12 * 60 }: EditorSemanaProps) {
  const total = minutos.reduce((t, m) => t + m, 0);
  const alto = Math.max(max, ...minutos);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center">
        <span className="display text-44">{formatarHorasCurto(total)}</span>
        <span className="block text-15 text-texto-2">por semana</span>
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {minutos.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              aria-label={`Mais ${passo} minutos na ${DIAS_LONGOS[i]}`}
              onClick={() => onChange(i, Math.min(max, m + passo))}
              className="flex size-11 items-center justify-center rounded-full bg-superficie-2 borda active:scale-95"
            >
              <Plus aria-hidden className="size-5" strokeWidth={2.5} />
            </button>
            <div className="relative flex h-32 w-full items-end overflow-hidden rounded-xl bg-superficie-2">
              <div
                className={cx("w-full rounded-xl transition-[height] duration-200", m > 0 ? "bg-primaria" : "bg-transparent")}
                style={{ height: `${(m / alto) * 100}%` }}
              />
            </div>
            <span className="numeros text-13 font-bold">{m > 0 ? formatarHorasCurto(m) : "folga"}</span>
            <span className={cx("text-13", i === 0 || i === 6 ? "font-bold text-texto" : "text-texto-2")}>{DIAS[i]}</span>
            <button
              type="button"
              aria-label={`Menos ${passo} minutos na ${DIAS_LONGOS[i]}`}
              onClick={() => onChange(i, Math.max(0, m - passo))}
              disabled={m === 0}
              className="flex size-11 items-center justify-center rounded-full bg-superficie-2 borda active:scale-95 disabled:opacity-40"
            >
              <Minus aria-hidden className="size-5" strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
