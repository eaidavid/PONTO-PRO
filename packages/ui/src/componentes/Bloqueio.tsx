import { LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

/** Recurso de plano pago: diz o que é, por que vale e leva para os planos. Sem esconder a tela inteira. */
export function Bloqueio({ titulo, texto, acao }: { titulo: string; texto: string; acao: ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-grande bg-primaria-suave p-5">
      <span className="flex items-center gap-2 text-apoio font-bold text-primaria-forte">
        <LockKeyhole aria-hidden className="size-5" /> Plano Pro
      </span>
      <h2 className="text-destaque font-bold">{titulo}</h2>
      <p className="text-corpo text-texto-2">{texto}</p>
      {acao}
    </section>
  );
}
