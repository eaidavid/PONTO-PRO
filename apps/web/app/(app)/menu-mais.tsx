"use client";

import { BottomSheet, cx } from "@ponto-pro/ui";
import { Calculator, ChevronRight, Gem, HardHat, type LucideIcon, Smartphone, Tags, Target, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Preferencias } from "../../lib/db";
import { instalarApp, usePodeInstalar } from "../../lib/instalar";
import { PreferenciasVisuais } from "./preferencias-visuais";

interface Atalho {
  href: string;
  rotulo: string;
  descricao: string;
  icone: LucideIcon;
  /** Cor do ícone: uma por tela, para achar de relance. */
  tom: string;
}

export interface SituacaoMenu {
  /** "Teste grátis do Individual", "Individual", "Grátis". */
  nome: string;
  /** "14 dias restantes", "pago até 05/12". */
  detalhe?: string;
  emTeste: boolean;
  /** 0 a 1: quanto do teste já passou. */
  progressoTeste?: number;
}

/** O botão "Mais": telas menos usadas em blocos grandes, a situação do plano e os ajustes rápidos. */
export function MenuMais({
  aberto,
  onFechar,
  usaProducao,
  preferencias,
  plano,
}: {
  aberto: boolean;
  onFechar: () => void;
  usaProducao: boolean;
  preferencias: Preferencias;
  plano?: SituacaoMenu;
}) {
  const podeInstalar = usePodeInstalar();
  const router = useRouter();
  const ir = (href: string) => {
    onFechar();
    setTimeout(() => router.push(href), 120);
  };
  const atalhos: Atalho[] = [
    { href: "/metas", rotulo: "Metas", descricao: "Quanto falta para ganhar mais", icone: Target, tom: "bg-extra-suave text-extra-texto" },
    { href: "/obras", rotulo: "Obras", descricao: "Horas e produção por lugar", icone: HardHat, tom: "bg-primaria-suave text-primaria-forte" },
    ...(usaProducao ? [{ href: "/producao", rotulo: "Catálogo", descricao: "Serviços e preços", icone: Tags, tom: "bg-primaria-suave text-primaria-forte" }] : []),
    { href: "/calculadora", rotulo: "Calculadora", descricao: "Salário e conta do dia", icone: Calculator, tom: "bg-superficie-2 text-texto" },
  ];
  return (
    <BottomSheet aberto={aberto} onFechar={onFechar} titulo="Mais">
      <div className="flex flex-col gap-5 pb-2">
        {plano && (
          <button type="button" onClick={() => ir("/planos")} className="fundo-marca flex flex-col gap-2 rounded-2xl p-4 text-left active:scale-[0.99]">
            <span className="flex items-center gap-3">
              <Gem aria-hidden className="size-6 shrink-0 text-marca-destaque" />
              <span className="min-w-0 flex-1">
                <span className="block text-17 font-bold">{plano.nome}</span>
                {plano.detalhe && <span className="block text-15 text-sobre-marca-2">{plano.detalhe}</span>}
              </span>
              <span className="text-15 font-bold whitespace-nowrap text-marca-destaque">Ver planos</span>
            </span>
            {plano.emTeste && plano.progressoTeste !== undefined && (
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-[color:var(--marca-trilho)]">
                <span className="block h-full rounded-full bg-marca-destaque" style={{ width: `${Math.round(plano.progressoTeste * 100)}%` }} />
              </span>
            )}
          </button>
        )}

        <ul className="grid grid-cols-2 gap-3">
          {atalhos.map((a) => (
            <li key={a.href}>
              <button
                type="button"
                onClick={() => ir(a.href)}
                className="cartao flex h-full min-h-28 w-full flex-col items-start gap-2 p-4 text-left active:scale-[0.98]"
              >
                <span aria-hidden className={cx("flex size-11 items-center justify-center rounded-2xl", a.tom)}>
                  <a.icone className="size-6" strokeWidth={2.25} />
                </span>
                <span className="flex flex-col">
                  <span className="text-17 font-bold leading-tight">{a.rotulo}</span>
                  <span className="text-13 leading-snug text-texto-2">{a.descricao}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => ir("/conta")} className="cartao flex min-h-16 items-center gap-3 px-4 py-2 text-left active:bg-superficie-2">
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-superficie-2">
            <User className="size-6" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-17 font-bold">Conta e regras</span>
            <span className="block text-13 text-texto-2">Valor da hora, semana, feriados, descontos e seus dados</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-texto-2" />
        </button>

        {podeInstalar && (
          <button type="button" onClick={() => instalarApp()} className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-dashed border-primaria px-4 text-left active:bg-primaria-suave">
            <Smartphone aria-hidden className="size-6 shrink-0 text-primaria-forte" />
            <span className="flex-1">
              <span className="block text-17 font-bold">Instalar o app</span>
              <span className="block text-13 text-texto-2">Abre da tela inicial, mesmo sem internet</span>
            </span>
          </button>
        )}

        <div className="rounded-2xl bg-superficie-2 p-4">
          <PreferenciasVisuais preferencias={preferencias} />
        </div>
      </div>
    </BottomSheet>
  );
}
