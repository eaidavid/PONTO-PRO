import { Lightbulb } from "lucide-react";

/** Marca valores que vieram do modelo e ainda não foram conferidos. */
export function SeloSugestao({ texto = "Sugestão — confira com seu sindicato ou contador" }: { texto?: string }) {
  return (
    <span className="inline-flex items-start gap-1.5 rounded-xl bg-extra-suave px-3 py-1.5 text-13 font-bold text-extra-texto">
      <Lightbulb aria-hidden className="mt-px size-4 shrink-0" />
      {texto}
    </span>
  );
}
