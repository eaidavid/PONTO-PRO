import { cx } from "@ponto-pro/ui";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { BotaoComecar } from "../_vendas/link-medido";
import { LARGURA } from "./largura";

export interface Duvida {
  pergunta: string;
  resposta: string;
}

/**
 * Página de uma calculadora: a pergunta, a conta que se mexe, como a conta é feita,
 * as dúvidas comuns e o convite para acompanhar isso todo dia no app.
 */
export function PaginaCalculadora({
  slug,
  titulo,
  intro,
  calculadora,
  comoFunciona,
  duvidas,
  convite,
}: {
  slug: string;
  titulo: string;
  intro: string;
  calculadora: ReactNode;
  comoFunciona: ReactNode;
  duvidas: Duvida[];
  convite: string;
}) {
  return (
    <>
      <section className="fundo-marca">
        <div className={cx(LARGURA, "flex flex-col gap-3 py-8 md:py-12")}>
          <h1 className="display max-w-[22ch] text-[clamp(1.9rem,8vw,3rem)] leading-[1.04] text-balance">{titulo}</h1>
          <p className="max-w-[56ch] text-17 text-sobre-marca-2 md:text-20">{intro}</p>
        </div>
      </section>

      <div className={cx(LARGURA, "grid gap-10 py-8 md:grid-cols-[1.15fr_1fr] md:gap-12 md:py-12")}>
        <div className="min-w-0">{calculadora}</div>
        <aside className="flex flex-col gap-4 self-start rounded-[24px] bg-primaria-suave p-5 md:sticky md:top-20 md:p-6">
          <h2 className="display text-24 leading-tight text-balance">{convite}</h2>
          <p className="text-15 text-texto-2">
            Bata o ponto no celular e o Pingou faz essa conta sozinho, todo dia, com as suas horas de verdade. Grátis, sem cartão.
          </p>
          <BotaoComecar secao={`calc-${slug}`} className="self-start" />
        </aside>
      </div>

      <section aria-labelledby="t-como" className={cx(LARGURA, "flex flex-col gap-4 pb-10")}>
        <h2 id="t-como" className="display text-[clamp(1.5rem,6vw,2.1rem)] leading-tight">Como a conta é feita</h2>
        <div className="flex max-w-[66ch] flex-col gap-3 text-17 text-texto-2 [&_b]:text-texto">{comoFunciona}</div>
      </section>

      <section aria-labelledby="t-duvidas" className="bg-superficie-2">
        <div className={cx(LARGURA, "grid gap-5 py-10 md:grid-cols-[1fr_1.7fr] md:gap-14 md:py-14")}>
          <h2 id="t-duvidas" className="display text-[clamp(1.5rem,6vw,2.1rem)] leading-tight">Dúvidas comuns</h2>
          <div className="divide-y divide-borda-forte border-y border-borda-forte">
            {duvidas.map((d) => (
              <details key={d.pergunta} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-2.5 text-17 font-bold [&::-webkit-details-marker]:hidden">
                  {d.pergunta}
                  <ChevronDown aria-hidden className="size-5 shrink-0 text-texto-2 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="max-w-[62ch] pb-4 text-15 text-texto-2">{d.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: dados estruturados do Google, texto nosso
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: duvidas.map((d) => ({ "@type": "Question", name: d.pergunta, acceptedAnswer: { "@type": "Answer", text: d.resposta } })),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
