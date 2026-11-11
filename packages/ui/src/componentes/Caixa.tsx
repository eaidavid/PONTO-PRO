"use client";

import { Check } from "lucide-react";
import { type ReactNode, useId } from "react";
import { cx } from "../cx";

/** Caixa de marcar grande (48px), com o texto tocável junto. */
export function Caixa({ marcado, onChange, children }: { marcado: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-start gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={marcado}
        aria-labelledby={id}
        onClick={() => onChange(!marcado)}
        className="-m-2 flex size-12 shrink-0 items-center justify-center rounded-xl"
      >
        <span className={cx("flex size-7 items-center justify-center rounded-lg border-2", marcado ? "border-primaria bg-primaria text-sobre-primaria" : "border-borda-forte bg-superficie")}>
          {marcado && <Check aria-hidden className="size-5" strokeWidth={3} />}
        </span>
      </button>
      <div id={id} className="pt-0.5 text-15 leading-snug" onClick={() => onChange(!marcado)}>
        {children}
      </div>
    </div>
  );
}
