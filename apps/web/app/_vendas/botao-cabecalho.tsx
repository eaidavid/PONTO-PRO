"use client";

import Link from "next/link";
import { useEstado } from "../../lib/estado";
import { medir } from "../../lib/medir";

/**
 * Botão do cabeçalho da página de vendas.
 * Quem já configurou o app vê "Abrir o app" (a página não redireciona mais sozinha:
 * assim quem tem o app instalado também consegue ver a página).
 */
export function BotaoCabecalho() {
  const jaUsa = !!useEstado()?.perfil;
  return (
    <Link
      href={jaUsa ? "/hoje" : "/comecar"}
      onClick={() => medir("clique_comecar", { secao: "cabecalho" })}
      className="inline-flex min-h-12 items-center rounded-full bg-white px-5 font-bold whitespace-nowrap text-[color:var(--marca)]"
    >
      {jaUsa ? "Abrir o app" : "Começar"}
    </Link>
  );
}
