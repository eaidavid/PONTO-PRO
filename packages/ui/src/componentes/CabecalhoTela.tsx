import type { ReactNode } from "react";

/** Título da tela: grande, com linha de apoio e espaço para uma ação à direita. */
export function CabecalhoTela({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: ReactNode; acao?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-6 pb-2">
      <div className="min-w-0">
        <h1 className="display text-32">{titulo}</h1>
        {subtitulo && <p className="text-15 text-texto-2">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  );
}
