import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { Skeleton } from "./Skeleton";

export interface CartaoValorProps {
  rotulo: string;
  valor: ReactNode;
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

const FUNDO_ICONE = {
  normal: "bg-superficie-2 text-texto-2",
  primaria: "bg-primaria-suave text-primaria-forte",
  extra: "bg-extra-suave text-extra-texto",
  erro: "bg-erro-suave text-erro-texto",
  sucesso: "bg-sucesso-suave text-sucesso-texto",
} as const;

/** Cartão com ícone, rótulo, número grande e uma linha de detalhe. */
export function CartaoValor({ rotulo, valor, detalhe, tom = "normal", tamanho = "m", icone: Icone, carregando, children, className }: CartaoValorProps) {
  return (
    <div className={cx("cartao relative flex flex-col gap-2 overflow-hidden p-4", className)}>
      {tom === "extra" && <span aria-hidden className="faixa-seguranca absolute inset-x-0 top-0 h-1.5" />}
      <span className="flex flex-col items-start gap-2 text-15 font-bold text-texto-2">
        {Icone && (
          <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-full", FUNDO_ICONE[tom])}>
            <Icone aria-hidden className="size-5" strokeWidth={2.25} />
          </span>
        )}
        <span className="min-w-0 break-words leading-tight">{rotulo}</span>
      </span>
      {carregando ? (
        <Skeleton className={tamanho === "g" ? "h-12 w-48" : "h-8 w-24"} />
      ) : (
        <span className={cx("display leading-none", tamanho === "g" ? "text-44" : "text-32", COR[tom])}>{valor}</span>
      )}
      {detalhe && <span className={cx("text-15", tom === "extra" ? "text-extra-texto" : "text-texto-2")}>{detalhe}</span>}
      {children}
    </div>
  );
}
