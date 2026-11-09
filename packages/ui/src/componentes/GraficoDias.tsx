"use client";

import { formatarReais, seloDia } from "@ponto-pro/core";
import { useState } from "react";
import { cx } from "../cx";

export interface DiaGrafico {
  data: string;
  normal: number;
  extra: number;
}

/**
 * Ganho por dia: barra verde (normal) com o topo laranja (hora extra), 2px de separação.
 * Tocar numa barra mostra o valor. Legenda sempre visível (duas séries).
 */
export function GraficoDias({ dias, hoje }: { dias: DiaGrafico[]; hoje?: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(1, ...dias.map((d) => d.normal + d.extra));
  const atual = dias.find((d) => d.data === sel);
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-17 font-bold">Ganho por dia</span>
        <span className="flex gap-3 text-13 text-texto-2">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-sm bg-primaria" />Normal</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-sm bg-extra" />Hora extra</span>
        </span>
      </figcaption>
      <p aria-live="polite" className="numeros min-h-6 text-15 text-texto-2">
        {atual ? (
          <>
            <b className="text-texto">{seloDia(atual.data)}</b>: {formatarReais(atual.normal + atual.extra)}
            {atual.extra > 0 && <> · extra {formatarReais(atual.extra)}</>}
          </>
        ) : (
          "Toque numa barra para ver o valor do dia."
        )}
      </p>
      <div className="flex h-36 items-end gap-[2px] border-b border-borda-forte">
        {dias.map((d) => {
          const total = d.normal + d.extra;
          return (
            <button
              key={d.data}
              type="button"
              onClick={() => setSel(d.data === sel ? null : d.data)}
              aria-label={`${seloDia(d.data)}: ${formatarReais(total)}`}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              {d.extra > 0 && (
                <span className="mb-[2px] block w-full rounded-t-[4px] bg-extra" style={{ height: `${(d.extra / max) * 100}%` }} />
              )}
              {d.normal > 0 && (
                <span
                  className={cx("block w-full bg-primaria", d.extra > 0 ? "" : "rounded-t-[4px]", d.data === sel && "brightness-125", d.data === hoje && "ring-2 ring-texto")}
                  style={{ height: `${(d.normal / max) * 100}%` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </figure>
  );
}
