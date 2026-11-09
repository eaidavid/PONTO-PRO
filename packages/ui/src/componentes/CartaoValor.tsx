import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { Skeleton } from "./Skeleton";

export interface CartaoValorProps {
  rotulo: string;
  valor: string;
  /** Linha pequena abaixo (ex.: "+0h30 de extra"). */
  detalhe?: string;
  tom?: "normal" | "primaria" | "extra" | "erro" | "sucesso";
  tamanho?: "m" | "g";
  icone?: LucideIcon;
  carregando?: boolean;
  children?: ReactNode;
  className?: string;
}

const COR = {
  normal: "text-texto",
  primaria: "text-primaria",
  extra: "text-extra-texto",
  erro: "text-erro-texto",
  sucesso: "text-sucesso-texto",
} as const;

/** Cartão com rótulo, número grande e uma linha de detalhe. */
export function CartaoValor({ rotulo, valor, detalhe, tom = "normal", tamanho = "m", icone: Icone, carregando, children, className }: CartaoValorProps) {
  return (
    <div className={cx("flex flex-col gap-1 rounded-cartao bg-superficie p-4 borda shadow-min", className)}>
      <span className="flex items-center gap-2 text-15 text-texto-2">
        {Icone && <Icone aria-hidden className="size-5 shrink-0" />}
        {rotulo}
      </span>
      {carregando ? (
        <Skeleton className={tamanho === "g" ? "h-12 w-48" : "h-8 w-24"} />
      ) : (
        <span className={cx("numeros font-bold", tamanho === "g" ? "text-44" : "text-24", COR[tom])}>{valor}</span>
      )}
      {detalhe && <span className={cx("text-15", tom === "extra" ? "text-extra-texto" : "text-texto-2")}>{detalhe}</span>}
      {children}
    </div>
  );
}
