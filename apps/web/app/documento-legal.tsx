import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL, MARCA } from "../lib/marca";

/** Moldura de leitura (modo "Read"): texto corrido, largura de leitura confortável. */
export function DocumentoLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[680px] flex-col gap-6 px-5 py-6">
      <Link href="/conta" className="-ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-full px-2 text-15 font-bold active:bg-superficie-2">
        <ChevronLeft aria-hidden className="size-5" /> Voltar
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="display text-32">{titulo}</h1>
        <p className="text-15 text-texto-2">
          {MARCA.nome} · versão de {LEGAL.versao.split("-").reverse().join("/")}
        </p>
      </header>
      <article className="flex max-w-[65ch] flex-col gap-4 text-17 leading-relaxed [&_h2]:pt-4 [&_h2]:text-20 [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </article>
    </main>
  );
}
