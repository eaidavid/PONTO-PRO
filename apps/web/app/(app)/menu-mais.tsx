"use client";

import { BottomSheet } from "@ponto-pro/ui";
import { ChevronRight, HardHat, type LucideIcon, Smartphone, Tags, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Preferencias } from "../../lib/db";
import { instalarApp, usePodeInstalar } from "../../lib/instalar";
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
  const podeInstalar = usePodeInstalar();
  const router = useRouter();
  const ir = (href: string) => {
    onFechar();
    setTimeout(() => router.push(href), 120);
  };
  const atalhos: Atalho[] = [
    { href: "/obras", rotulo: "Obras", descricao: "Separar horas e produção por lugar", icone: HardHat },
    ...(usaProducao ? [{ href: "/producao", rotulo: "Catálogo de serviços", descricao: "Favoritos, categorias e preços", icone: Tags }] : []),
    { href: "/conta", rotulo: "Conta e regras", descricao: "Valor, semana, feriados, descontos", icone: User },
  ];
  return (
    <BottomSheet aberto={aberto} onFechar={onFechar} titulo="Mais">
      <div className="flex flex-col gap-5 pb-2">
        {podeInstalar && (
          <button
            type="button"
            onClick={() => instalarApp()}
            className="fundo-marca flex min-h-16 items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.98]"
          >
            <Smartphone aria-hidden className="size-7 shrink-0 text-marca-destaque" />
            <span className="flex-1">
              <span className="block text-17 font-bold">Instalar o app</span>
              <span className="block text-15 text-sobre-marca-2">Abre direto da tela inicial, mesmo sem internet.</span>
            </span>
          </button>
        )}
        <ul className="cartao divide-y divide-borda overflow-hidden">
          {atalhos.map((a) => (
            <li key={a.href}>
              <button type="button" onClick={() => ir(a.href)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-primaria-forte">
                  <a.icone aria-hidden className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-17 font-bold">{a.rotulo}</span>
                  <span className="block text-15 text-texto-2">{a.descricao}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 text-texto-2" />
              </button>
            </li>
          ))}
        </ul>
        <PreferenciasVisuais preferencias={preferencias} />
      </div>
    </BottomSheet>
  );
}
