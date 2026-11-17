import { cx } from "@ponto-pro/ui";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CALCULADORAS } from "../../lib/site";
import { LARGURA } from "./largura";

export const metadata: Metadata = {
  title: { absolute: "Calculadoras trabalhistas grátis: hora extra, férias, 13º e rescisão | Pingou" },
  description: "Contas do trabalhador CLT, grátis e com o passo a passo: hora extra, salário líquido, férias, 13º salário e rescisão.",
  alternates: { canonical: "/calculadoras" },
};

export default function Calculadoras() {
  return (
    <>
      <section className="fundo-marca">
        <div className={cx(LARGURA, "flex flex-col gap-3 py-8 md:py-12")}>
          <h1 className="display max-w-[20ch] text-[clamp(1.9rem,8vw,3rem)] leading-[1.04] text-balance">Contas do trabalhador, de graça e com o passo a passo.</h1>
          <p className="max-w-[56ch] text-corpo text-sobre-marca-2 md:text-destaque">Escolha a pergunta. Cada conta mostra de onde sai cada real.</p>
        </div>
      </section>
      <div className={cx(LARGURA, "py-8 md:py-12")}>
        <ul className="grid gap-3 md:grid-cols-2">
          {CALCULADORAS.map((c) => (
            <li key={c.caminho}>
              <Link href={c.caminho} className="flex min-h-20 items-center gap-4 rounded-grande bg-superficie-2 px-5 py-4 active:bg-primaria-suave">
                <span className="flex-1">
                  <span className="display block text-destaque">{c.pergunta}</span>
                  <span className="text-apoio text-texto-2">Calculadora de {c.nome.toLowerCase()}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-primaria" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
