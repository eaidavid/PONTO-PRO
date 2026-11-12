import { Lightbulb } from "lucide-react";

/**
 * Marca valores que vieram do modelo e ainda não foram conferidos.
 * Compacto: uma etiqueta curta numa linha (o texto completo fica para o leitor de tela).
 */
export function SeloSugestao({ texto = "Sugestão — confira com seu sindicato ou contador", compacto }: { texto?: string; compacto?: boolean }) {
  if (compacto) {
    return (
      <span className="inline-flex items-center gap-1 self-start rounded-full bg-extra-suave px-2 py-0.5 text-13 font-bold text-extra-texto">
        <Lightbulb aria-hidden className="size-3.5 shrink-0" />
        Sugestão
        <span className="sr-only"> — confira com seu sindicato</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-start gap-1.5 rounded-xl bg-extra-suave px-3 py-1.5 text-13 font-bold text-extra-texto">
      <Lightbulb aria-hidden className="mt-px size-4 shrink-0" />
      {texto}
    </span>
  );
}
