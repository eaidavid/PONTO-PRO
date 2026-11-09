import type { TipoDia } from "@ponto-pro/core";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Ban, CircleCheck, Moon, Star, Stethoscope } from "lucide-react";
import { cx } from "../cx";
import { Chip } from "./Chip";

export const TIPOS_DIA: Record<TipoDia, { rotulo: string; icone: LucideIcon; tom: "primaria" | "erro" | "extra" }> = {
  normal: { rotulo: "Normal", icone: CircleCheck, tom: "primaria" },
  falta: { rotulo: "Falta", icone: Ban, tom: "erro" },
  atestado: { rotulo: "Atestado", icone: Stethoscope, tom: "primaria" },
  feriado: { rotulo: "Feriado", icone: Star, tom: "primaria" },
  folga: { rotulo: "Folga", icone: Moon, tom: "primaria" },
  compensado: { rotulo: "Compensado", icone: ArrowLeftRight, tom: "primaria" },
};

/** Selo pequeno (somente leitura) do tipo do dia, para a lista. */
export function SeloTipoDia({ tipo, texto }: { tipo: TipoDia; texto?: string }) {
  const t = TIPOS_DIA[tipo];
  const Icone = t.icone;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-15 font-bold",
        tipo === "falta" ? "bg-erro-suave text-erro-texto" : "bg-primaria-suave text-primaria-forte",
      )}
    >
      <Icone aria-hidden className="size-4" strokeWidth={2.5} />
      {texto ?? t.rotulo}
    </span>
  );
}

/** Grupo de chips para escolher o tipo do dia. */
export function EscolhaTipoDia({ valor, onChange }: { valor: TipoDia; onChange: (t: TipoDia) => void }) {
  return (
    <div role="group" aria-label="Tipo do dia" className="flex flex-wrap gap-2">
      {(Object.keys(TIPOS_DIA) as TipoDia[]).map((t) => (
        <Chip key={t} icone={TIPOS_DIA[t].icone} tom={TIPOS_DIA[t].tom} selecionado={valor === t} onClick={() => onChange(t)}>
          {TIPOS_DIA[t].rotulo}
        </Chip>
      ))}
    </div>
  );
}
