"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cx } from "../cx";

export interface BottomSheetProps {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  /** Linha abaixo do título. */
  subtitulo?: string;
  children: ReactNode;
  /** Área fixa no rodapé (ex.: botão Salvar). */
  rodape?: ReactNode;
}

/**
 * Painel que sobe por baixo. Usa <dialog> nativo: prende o foco,
 * fecha com Esc, com "Fechar" ou tocando fora.
 */
export function BottomSheet({ aberto, onFechar, titulo, subtitulo, children, rodape }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={onFechar}
      onClick={(e) => {
        if (e.target === ref.current) onFechar();
      }}
      className={cx(
        "fixed inset-x-0 bottom-0 top-auto m-0 mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-painel bg-superficie p-0 text-texto borda shadow-painel",
        "backdrop:bg-black/50 not-open:hidden open:animate-subir",
      )}
    >
      <div className="flex flex-col gap-1 px-5 pt-2 pb-3">
        <span aria-hidden className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-borda-forte" />
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 id={idTitulo} className="display text-24">{titulo}</h2>
            {subtitulo && <p className="text-15 text-texto-2">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="-mr-2 inline-flex min-h-12 items-center gap-1 rounded-full px-3 text-15 font-bold text-texto-2 active:bg-superficie-2"
          >
            <X aria-hidden className="size-5" /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
      {rodape && <div className="border-t border-borda px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">{rodape}</div>}
    </dialog>
  );
}
