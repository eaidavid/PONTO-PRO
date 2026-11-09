import type { LucideIcon } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";

export interface BotaoPrincipalProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primaria" | "secundaria" | "perigo" | "fantasma";
  /** m = 56px, g = 64px */
  tamanho?: "m" | "g";
  icone?: LucideIcon;
  carregando?: boolean;
  larguraTotal?: boolean;
}

const VARIANTES = {
  primaria: "bg-primaria text-sobre-primaria active:bg-primaria-forte",
  secundaria: "bg-superficie text-primaria borda border-primaria! active:bg-primaria-suave",
  perigo: "bg-erro-suave text-erro-texto borda border-erro! active:brightness-95",
  fantasma: "bg-transparent text-primaria active:bg-primaria-suave",
} as const;

/** Botão de ação principal: pílula, largura total, 56–64px de altura. */
export function BotaoPrincipal({
  variante = "primaria",
  tamanho = "m",
  icone: Icone,
  carregando = false,
  larguraTotal = true,
  disabled,
  className,
  children,
  ...resto
}: BotaoPrincipalProps) {
  const inativo = disabled || carregando;
  return (
    <button
      type="button"
      {...resto}
      disabled={inativo}
      aria-busy={carregando || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-3 rounded-full px-6 font-bold transition-[transform,background-color] duration-150 active:scale-[0.98] select-none",
        tamanho === "g" ? "min-h-16 text-20" : "min-h-14 text-17",
        larguraTotal && "w-full",
        inativo && !carregando
          ? "bg-superficie-2 text-texto-2 borda active:scale-100"
          : VARIANTES[variante],
        className,
      )}
    >
      {carregando ? (
        <LoaderCircle aria-hidden className="size-6 animate-spin" strokeWidth={2.25} />
      ) : (
        Icone && <Icone aria-hidden className="size-6 shrink-0" strokeWidth={2.25} />
      )}
      <span>{carregando ? "Salvando…" : children}</span>
    </button>
  );
}
