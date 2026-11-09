"use client";

import { BottomSheet } from "@ponto-pro/ui";
import { ChevronRight, Hammer, type LucideIcon, Target, User } from "lucide-react";
import Link from "next/link";
import type { Preferencias } from "../../lib/db";
import { PreferenciasVisuais } from "./preferencias-visuais";

interface Atalho {
  href: string;
  rotulo: string;
  descricao: string;
  icone: LucideIcon;
}

/** O botão "Mais" agrupa as telas menos usadas e os ajustes rápidos. */
export function MenuMais({
  aberto,
  onFechar,
  usaProducao,
  preferencias,
}: {
  aberto: boolean;
  onFechar: () => void;
  usaProducao: boolean;
  preferencias: Preferencias;
}) {
  const atalhos: Atalho[] = [
    ...(usaProducao ? [{ href: "/producao", rotulo: "Produção", descricao: "Lançar serviço e preços", icone: Hammer }] : []),
    { href: "/metas", rotulo: "Metas", descricao: "Quanto quero receber", icone: Target },
    { href: "/conta", rotulo: "Conta e regras", descricao: "Valor, semana, descontos", icone: User },
  ];
  return (
    <BottomSheet aberto={aberto} onFechar={onFechar} titulo="Mais">
      <div className="flex flex-col gap-5 pb-2">
        <ul className="cartao divide-y divide-borda overflow-hidden">
          {atalhos.map((a) => (
            <li key={a.href}>
              <Link href={a.href} onClick={onFechar} className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-superficie-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-primaria-forte">
                  <a.icone aria-hidden className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-17 font-bold">{a.rotulo}</span>
                  <span className="block text-15 text-texto-2">{a.descricao}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 text-texto-2" />
              </Link>
            </li>
          ))}
        </ul>
        <PreferenciasVisuais preferencias={preferencias} />
      </div>
    </BottomSheet>
  );
}
