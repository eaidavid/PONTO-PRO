import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selecionado?: boolean;
  icone?: LucideIcon;
  tom?: "primaria" | "erro" | "extra";
}

const SEL = {
  primaria: "bg-primaria text-sobre-primaria border-primaria",
  erro: "bg-erro-texto text-white border-erro-texto",
  extra: "bg-extra-texto text-white border-extra-texto",
} as const;

/** Chip em pílula, 48px de altura. Selecionado mostra um check. */
export function Chip({ selecionado, icone: Icone, tom = "primaria", className, children, ...resto }: ChipProps) {
  const IconeFinal = selecionado ? Check : Icone;
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      {...resto}
      className={cx(
        "inline-flex min-h-12 items-center gap-2 rounded-full border-[length:var(--borda-largura)] px-4 text-17 font-bold transition-colors duration-150 active:scale-[0.97] disabled:opacity-60",
        selecionado ? SEL[tom] : "border-borda-forte bg-superficie text-texto active:bg-superficie-2",
        className,
      )}
    >
      {IconeFinal && <IconeFinal aria-hidden className="size-5 shrink-0" strokeWidth={selecionado ? 3 : 2} />}
      <span className="numeros">{children}</span>
    </button>
  );
}
