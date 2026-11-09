import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cx } from "../cx";

export interface CartaoOpcaoProps {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  selecionado: boolean;
  onClick: () => void;
}

/** Cartão grande de escolha (onboarding): ícone, título e uma linha. */
export function CartaoOpcao({ icone: Icone, titulo, descricao, selecionado, onClick }: CartaoOpcaoProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      onClick={onClick}
      className={cx(
        "cartao flex min-h-20 w-full items-center gap-4 p-4 text-left transition-[transform,border-color] duration-150 active:scale-[0.98]",
        selecionado && "border-primaria! ring-2 ring-primaria",
      )}
    >
      <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-2xl", selecionado ? "bg-primaria text-sobre-primaria" : "bg-primaria-suave text-primaria-forte")}>
        <Icone aria-hidden className="size-6" strokeWidth={2.25} />
      </span>
      <span className="flex-1">
        <span className="block text-20 font-bold">{titulo}</span>
        {descricao && <span className="block text-15 text-texto-2">{descricao}</span>}
      </span>
      <span aria-hidden className={cx("flex size-7 shrink-0 items-center justify-center rounded-full border-2", selecionado ? "border-primaria bg-primaria text-sobre-primaria" : "border-borda-forte")}>
        {selecionado && <Check className="size-4" strokeWidth={3} />}
      </span>
    </button>
  );
}
