import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { SeloSugestao } from "./SeloSugestao";

export interface LinhaAjusteProps {
  icone?: LucideIcon;
  rotulo: string;
  valor?: string;
  sugestao?: boolean;
  perigo?: boolean;
  onClick: () => void;
}

/** Linha tocável de ajustes (tela Conta): rótulo, valor atual e seta. */
export function LinhaAjuste({ icone: Icone, rotulo, valor, sugestao, perigo, onClick }: LinhaAjusteProps) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-superficie-2">
      {Icone && (
        <span className={perigo ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-erro-suave text-erro-texto" : "flex size-10 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-primaria-forte"}>
          <Icone aria-hidden className="size-5" strokeWidth={2.25} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={perigo ? "text-17 font-bold text-erro-texto" : "text-17 font-bold"}>{rotulo}</span>
        {valor && <span className="numeros text-15 text-texto-2">{valor}</span>}
        {sugestao && <SeloSugestao compacto />}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-texto-2" />
    </button>
  );
}
