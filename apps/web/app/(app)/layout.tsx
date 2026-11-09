"use client";

import { abasCompactas, BarraNavegacao } from "@ponto-pro/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { abaExtraDoPerfil, useEstado } from "../../lib/estado";
import { Carregando } from "../carregando";
import { MenuMais } from "./menu-mais";

const GRUPO: Record<string, string> = { hoje: "hoje", registros: "registros", producao: "registros", ganhos: "ganhos", metas: "mais", conta: "mais" };

export default function LayoutApp({ children }: { children: ReactNode }) {
  const estado = useEstado();
  const router = useRouter();
  const caminho = usePathname();
  const [mais, setMais] = useState(false);
  useEffect(() => {
    if (estado && !estado.perfil) router.replace("/comecar");
  }, [estado, router]);
  if (!estado?.perfil) return <Carregando />;
  const tela = caminho.split("/")[1] ?? "hoje";
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(84px+env(safe-area-inset-bottom))]">{children}</div>
      <BarraNavegacao abas={abasCompactas(() => setMais(true))} ativa={mais ? "mais" : (GRUPO[tela] ?? "hoje")} link={Link} />
      <MenuMais
        aberto={mais}
        onFechar={() => setMais(false)}
        usaProducao={abaExtraDoPerfil(estado.perfil) === "producao"}
        preferencias={estado.preferencias}
      />
    </>
  );
}
