"use client";

import { horaParaMin, minParaHora } from "@ponto-pro/core";
import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cx } from "../cx";
import { Chip } from "./Chip";

export interface SeletorHoraProps {
  valor: string;
  onChange: (hora: string) => void;
  /** Horários comuns da escala da pessoa. */
  comuns: string[];
  rotulo?: string;
}

/** "1158" → "11:58"; "930" → "09:30"; "7" → "07:00". null se não for um horário. */
export function lerHoraDigitada(texto: string): string | null {
  const d = texto.replace(/\D/g, "");
  if (!d || d.length > 4) return null;
  let h: number;
  let m: number;
  if (d.length <= 2) {
    h = Number(d);
    m = 0;
  } else if (d.length === 3) {
    h = Number(d.slice(0, 1));
    m = Number(d.slice(1));
  } else {
    h = Number(d.slice(0, 2));
    m = Number(d.slice(2));
  }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Mostra o que está sendo digitado já com os dois pontos: "115" → "11:5". */
function mascarar(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, d.length - 2)}:${d.slice(-2)}`;
}

const AJUSTES = [
  { delta: -5, rotulo: "5", nome: "Menos 5 minutos" },
  { delta: -1, rotulo: "1", nome: "Menos 1 minuto" },
  { delta: 1, rotulo: "1", nome: "Mais 1 minuto" },
  { delta: 5, rotulo: "5", nome: "Mais 5 minutos" },
];

/**
 * Seletor de hora grande: o horário em destaque dá para digitar (toque e digite 1158 para 11:58),
 * botões de 1 e de 5 minutos e chips com os horários da escala. Nada de seletor nativo pequeno.
 */
export function SeletorHora({ valor, onChange, comuns, rotulo = "Horário" }: SeletorHoraProps) {
  const id = useId();
  const [texto, setTexto] = useState(valor);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!editando) setTexto(valor);
  }, [valor, editando]);

  const mudar = (delta: number) => {
    setErro(false);
    onChange(minParaHora(horaParaMin(valor) + delta));
  };

  function confirmar() {
    const h = lerHoraDigitada(texto);
    setEditando(false);
    if (h) {
      setErro(false);
      setTexto(h);
      if (h !== valor) onChange(h);
    } else {
      setErro(texto.trim() !== "" && texto !== valor);
      setTexto(valor);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1">
        <label htmlFor={id} className="text-apoio text-texto-2">{rotulo}</label>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          value={texto}
          onFocus={(e) => {
            setEditando(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            const t = mascarar(e.target.value);
            setTexto(t);
            setErro(false);
            // com os 4 números já dá para aplicar sem precisar sair do campo
            const h = t.replace(/\D/g, "").length === 4 ? lerHoraDigitada(t) : null;
            if (h && h !== valor) onChange(h);
          }}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          aria-describedby={`${id}-ajuda`}
          aria-invalid={erro || undefined}
          className={cx(
            "numeros w-[6.5ch] rounded-cartao border-2 bg-transparent text-center text-numero font-bold outline-none focus:border-primaria focus:bg-superficie",
            erro ? "border-erro" : "border-transparent",
          )}
        />
        <p id={`${id}-ajuda`} className={cx("text-legenda", erro ? "font-bold text-erro-texto" : "text-texto-2")}>
          {erro ? "Horário inválido. Use de 00:00 a 23:59." : "Toque no horário para digitar"}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {AJUSTES.map((a) => (
          <button
            key={a.nome}
            type="button"
            aria-label={a.nome}
            onClick={() => mudar(a.delta)}
            className="inline-flex min-h-12 items-center justify-center gap-1 rounded-full bg-superficie-2 text-corpo font-bold borda active:scale-[0.97]"
          >
            {a.delta < 0 ? <Minus aria-hidden className="size-4" strokeWidth={2.5} /> : <Plus aria-hidden className="size-4" strokeWidth={2.5} />}
            {a.rotulo}
            <span aria-hidden className="text-legenda font-normal text-texto-2">min</span>
          </button>
        ))}
      </div>
      <div role="group" aria-label="Horários comuns" className="flex flex-wrap justify-center gap-2">
        {comuns.map((h) => (
          <Chip key={h} selecionado={h === valor} onClick={() => onChange(h)}>{h}</Chip>
        ))}
      </div>
    </div>
  );
}
