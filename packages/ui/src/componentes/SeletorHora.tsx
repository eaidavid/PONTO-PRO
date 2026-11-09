"use client";

import { horaParaMin, minParaHora } from "@ponto-pro/core";
import { Minus, Plus } from "lucide-react";
import { Chip } from "./Chip";

export interface SeletorHoraProps {
  valor: string;
  onChange: (hora: string) => void;
  /** Horários comuns da escala da pessoa. */
  comuns: string[];
  rotulo?: string;
}

/** Seletor de hora grande: horário em destaque, −5/+5 minutos e chips. Nada de seletor nativo pequeno. */
export function SeletorHora({ valor, onChange, comuns, rotulo = "Horário" }: SeletorHoraProps) {
  const mudar = (delta: number) => onChange(minParaHora(horaParaMin(valor) + delta));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center">
        <span className="block text-15 text-texto-2">{rotulo}</span>
        <output aria-live="polite" className="numeros block text-56 font-bold">{valor}</output>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => mudar(-5)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-superficie-2 text-20 font-bold borda active:scale-[0.97]">
          <Minus aria-hidden className="size-6" strokeWidth={2.5} /> 5 min
        </button>
        <button type="button" onClick={() => mudar(5)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-superficie-2 text-20 font-bold borda active:scale-[0.97]">
          <Plus aria-hidden className="size-6" strokeWidth={2.5} /> 5 min
        </button>
      </div>
      <div role="group" aria-label="Horários comuns" className="flex flex-wrap justify-center gap-2">
        {comuns.map((h) => (
          <Chip key={h} selecionado={h === valor} onClick={() => onChange(h)}>{h}</Chip>
        ))}
      </div>
    </div>
  );
}
