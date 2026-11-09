"use client";

import { abasProduto, BarraNavegacao } from "@ponto-pro/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { abaExtraDoPerfil, useEstado } from "../../lib/estado";
import { Carregando } from "../carregando";
import dynamic from "next/dynamic";

// Menus carregados só no primeiro toque: a tela abre mais rápido.
const MenuLancar = dynamic(() => import("./menu-lancar").then((m) => m.MenuLancar), { ssr: false });
const MenuMais = dynamic(() => import("./menu-mais").then((m) => m.MenuMais), { ssr: false });

const GRUPO: Record<string, string> = {
  hoje: "hoje",
  historico: "historico",
  registros: "historico",
  producao: "historico",
  ganhos: "ganhos",
  metas: "mais",
  conta: "mais",
  obras: "mais",
};

export default function LayoutApp({ children }: { children: ReactNode }) {
  const estado = useEstado();
  const router = useRouter();
  const caminho = usePathname();
  const [mais, setMais] = useState(false);
  const [lancar, setLancar] = useState(false);
  const [usado, setUsado] = useState({ lancar: false, mais: false });
  useEffect(() => {
    if (estado && !estado.perfil) router.replace("/comecar");
  }, [estado, router]);
  if (!estado?.perfil) return <Carregando />;
  const tela = caminho.split("/")[1] ?? "hoje";
  const ativa = mais ? "mais" : lancar ? "lancar" : (GRUPO[tela] ?? "hoje");
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(92px+env(safe-area-inset-bottom))]">{children}</div>
      <BarraNavegacao
        abas={abasProduto(
          () => {
            setUsado((u) => ({ ...u, lancar: true }));
            setLancar(true);
          },
          () => {
            setUsado((u) => ({ ...u, mais: true }));
            setMais(true);
          },
        )}
        ativa={ativa}
        link={Link}
      />
      {usado.lancar && <MenuLancar aberto={lancar} onFechar={() => setLancar(false)} estado={estado} />}
      {usado.mais && (
        <MenuMais
          aberto={mais}
          onFechar={() => setMais(false)}
          usaProducao={abaExtraDoPerfil(estado.perfil) === "producao"}
          preferencias={estado.preferencias}
        />
      )}
    </>
  );
}
