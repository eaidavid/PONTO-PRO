import { cx } from "@ponto-pro/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { MARCA } from "../../lib/marca";
import { CALCULADORAS } from "../../lib/site";
import { BotaoCabecalho } from "../_vendas/botao-cabecalho";
import { Gota } from "../_vendas/gota";
import { LARGURA } from "./largura";



/** Moldura das calculadoras públicas: o cabeçalho da página de vendas e a lista das outras contas. */
export default function LayoutCalculadoras({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 bg-[color:var(--marca)] text-sobre-marca">
        <div className={cx(LARGURA, "flex min-h-14 items-center justify-between gap-3")}>
          <Link href="/" className="display inline-flex min-h-12 items-center gap-1.5 text-destaque" aria-label={`${MARCA.nome}, início`}>
            <Gota className="size-7" />
            {MARCA.nome}
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 text-apoio">
            <Link href="/calculadoras" className="mr-1 hidden min-h-12 items-center rounded-full px-3 text-sobre-marca-2 active:bg-white/10 sm:inline-flex">
              Calculadoras
            </Link>
            <BotaoCabecalho />
          </nav>
        </div>
      </header>
      <main className="overflow-x-clip">{children}</main>
      <footer className="border-t border-borda">
        <div className={cx(LARGURA, "flex flex-col gap-6 py-8")}>
          <nav aria-label="Outras calculadoras" className="flex flex-col gap-2">
            <p className="text-apoio font-bold">Outras contas</p>
            <ul className="-mx-3 flex flex-wrap">
              {CALCULADORAS.map((c) => (
                <li key={c.caminho}>
                  <Link href={c.caminho} className="inline-flex min-h-12 items-center px-3 text-apoio font-bold underline underline-offset-4">
                    {c.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-legenda text-texto-2">
            {MARCA.nome}. As contas usam as regras gerais da CLT e as tabelas de INSS e IR do ano. São estimativas: acordo coletivo e casos especiais mudam o valor.{" "}
            <Link href="/termos" className="underline underline-offset-4">Termos</Link> e <Link href="/privacidade" className="underline underline-offset-4">Privacidade</Link>.
          </p>
        </div>
      </footer>
    </>
  );
}
