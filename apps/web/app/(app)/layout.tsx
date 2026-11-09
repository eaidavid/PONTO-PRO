"use client";

import { abasPadrao, BarraNavegacao } from "@ponto-pro/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { abaExtraDoPerfil, useEstado } from "../../lib/estado";
import { Carregando } from "../carregando";

export default function LayoutApp({ children }: { children: ReactNode }) {
  const estado = useEstado();
  const router = useRouter();
  const caminho = usePathname();
  useEffect(() => {
    if (estado && !estado.perfil) router.replace("/comecar");
  }, [estado, router]);
  if (!estado?.perfil) return <Carregando />;
  const ativa = caminho.split("/")[1] ?? "hoje";
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(104px+env(safe-area-inset-bottom))]">{children}</div>
      <BarraNavegacao abas={abasPadrao(abaExtraDoPerfil(estado.perfil))} ativa={ativa} link={Link} />
    </>
  );
}
