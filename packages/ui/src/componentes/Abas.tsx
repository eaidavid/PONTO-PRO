"use client";

import { cx } from "../cx";

export interface AbasProps<T extends string> {
  opcoes: { id: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
}

/** Abas em pílula (controle segmentado), 48px de altura. */
export function Abas<T extends string>({ opcoes, valor, onChange, rotulo }: AbasProps<T>) {
  return (
    <div role="tablist" aria-label={rotulo} className="flex gap-1 rounded-full bg-superficie-2 p-1 borda">
      {opcoes.map((o) => {
        const ativo = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(o.id)}
            className={cx(
              "min-h-12 flex-1 rounded-full px-2 text-15 font-bold transition-colors duration-150",
              ativo ? "cartao text-texto shadow-min" : "text-texto-2 active:bg-superficie",
            )}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
