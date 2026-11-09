import type { Etapa, Marcacoes } from "@ponto-pro/core";
import { Check } from "lucide-react";
import { cx } from "../cx";

const ORDEM: { id: Etapa; rotulo: string }[] = [
  { id: "entrada", rotulo: "Entrada" },
  { id: "almoco", rotulo: "Almoço" },
  { id: "volta", rotulo: "Volta" },
  { id: "saida", rotulo: "Saída" },
];

export interface EtapasDoDiaProps {
  marcacoes: Marcacoes;
  /** Etapa atual (anel na cor primária). null = dia encerrado. */
  etapaAtual: Etapa | null;
}

/** Linha com os 4 marcos do dia: Entrada, Almoço, Volta e Saída. */
export function EtapasDoDia({ marcacoes, etapaAtual }: EtapasDoDiaProps) {
  return (
    <ol aria-label="Etapas do dia" className="grid grid-cols-4">
      {ORDEM.map((e, i) => {
        const hora = marcacoes[e.id];
        const feito = !!hora;
        const atual = e.id === etapaAtual;
        return (
          <li key={e.id} aria-current={atual ? "step" : undefined} className="relative flex flex-col items-center gap-1 text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cx("absolute top-4 -left-1/2 h-[3px] w-full -translate-y-1/2", feito || atual ? "bg-sucesso" : "bg-borda-forte")}
              />
            )}
            <span
              className={cx(
                "relative z-10 flex size-8 items-center justify-center rounded-full",
                feito && "bg-sucesso text-white",
                atual && "bg-superficie ring-[3px] ring-primaria",
                !feito && !atual && "bg-superficie border-2 border-borda-forte",
              )}
            >
              {feito && <Check aria-hidden className="size-5" strokeWidth={3} />}
              {atual && <span aria-hidden className="size-2.5 rounded-full bg-primaria" />}
            </span>
            <span className={cx("text-[clamp(0.75rem,3.9vw,var(--text-15))] leading-tight", atual ? "font-bold text-texto" : "text-texto-2")}>{e.rotulo}</span>
            <span className={cx("numeros text-17", feito ? "font-bold text-texto" : "text-texto-2")}>
              {hora ?? "--:--"}
              <span className="sr-only">{feito ? " registrado" : atual ? " próxima etapa" : " ainda não"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
