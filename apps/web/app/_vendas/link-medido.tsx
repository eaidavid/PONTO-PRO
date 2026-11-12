"use client";

import { cx } from "@ponto-pro/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { medir } from "../../lib/medir";

/** Link da página de vendas que avisa a medição de qual seção veio o clique. */
export function LinkMedido({ href = "/comecar", secao, className, children }: { href?: string; secao: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => medir("clique_comecar", { secao })}>
      {children}
    </Link>
  );
}

/** O botão principal da página: leva ao começo do app. */
export function BotaoComecar({ children = "Começar grátis", secao, sobreMarca, className }: { children?: ReactNode; secao: string; sobreMarca?: boolean; className?: string }) {
  return (
    <LinkMedido
      secao={secao}
      className={cx(
        "inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-full px-6 text-center text-17 font-bold transition-transform duration-150 active:scale-[0.98] sm:px-7",
        sobreMarca ? "bg-white text-[color:var(--marca)]" : "sombra-botao bg-primaria text-sobre-primaria",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden className="size-5 shrink-0" strokeWidth={2.5} />
    </LinkMedido>
  );
}
