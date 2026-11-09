"use client";

import { cx } from "@ponto-pro/ui";
import Link from "next/link";

/** Abas no topo de Registros: Ponto e Produção na mesma seção. */
export function AbasRegistro({ ativa }: { ativa: "ponto" | "producao" }) {
  const itens = [
    { id: "ponto", rotulo: "Ponto", href: "/registros" },
    { id: "producao", rotulo: "Produção", href: "/producao" },
  ] as const;
  return (
    <nav aria-label="Seção de registros" className="flex gap-1 rounded-full bg-superficie-2 p-1 borda">
      {itens.map((i) => {
        const ativo = i.id === ativa;
        return (
          <Link
            key={i.id}
            href={i.href}
            replace
            aria-current={ativo ? "page" : undefined}
            className={cx(
              "flex min-h-11 flex-1 items-center justify-center rounded-full text-15 font-bold transition-colors duration-150",
              ativo ? "cartao text-texto" : "text-texto-2 active:bg-superficie",
            )}
          >
            {i.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
