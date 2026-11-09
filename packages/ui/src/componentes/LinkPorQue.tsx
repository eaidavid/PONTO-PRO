import { CircleHelp } from "lucide-react";
import { cx } from "../cx";

/** Abre o passo a passo do cálculo. */
export function LinkPorQue({ onClick, texto = "Por que deu isso?", className }: { onClick?: () => void; texto?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("-mx-2 inline-flex min-h-12 items-center gap-2 self-start rounded-full px-2 text-17 font-bold text-primaria underline underline-offset-4 active:bg-primaria-suave", className)}
    >
      <CircleHelp aria-hidden className="size-5" strokeWidth={2.25} />
      {texto}
    </button>
  );
}
