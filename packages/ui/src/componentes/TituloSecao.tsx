import type { ReactNode } from "react";

/** Título de seção: pequeno e discreto (15px, cinza escuro). Ação opcional à direita. */
export function TituloSecao({ children, acao, id }: { children: ReactNode; acao?: ReactNode; id?: string }) {
  return (
    <div className="flex min-h-8 items-end justify-between gap-2 px-1">
      <h2 id={id} className="text-15 font-bold text-texto-2">{children}</h2>
      {acao}
    </div>
  );
}
