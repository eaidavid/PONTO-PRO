"use client";

import { abasProduto, BarraNavegacao } from "@ponto-pro/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { abaExtraDoPerfil, useEstado } from "../../lib/estado";
import { agoraEmSaoPaulo, DIAS_TESTE, PLANOS } from "@ponto-pro/core";
import { ChevronLeft } from "lucide-react";
import { situacaoAtual } from "../../lib/plano";
import { EVENTO_ABRIR_MAIS } from "../../lib/eventos";
import { marcarInicioUso } from "../../lib/acoes";
import { LEGAL } from "../../lib/marca";
import { AceiteTermos } from "../aceite-termos";
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
  calculadora: "mais",
  planos: "mais",
};

/** Telas do menu Mais: ganham o atalho "‹ Mais" no topo (a de produção tem o próprio voltar). */
const TELAS_DO_MAIS = new Set(["metas", "obras", "calculadora", "planos"]);

export default function LayoutApp({ children }: { children: ReactNode }) {
  const estado = useEstado();
  const router = useRouter();
  const caminho = usePathname();
  const [mais, setMais] = useState(false);
  const [lancar, setLancar] = useState(false);
  const [usado, setUsado] = useState({ lancar: false, mais: false });
  useEffect(() => {
    if (estado && !estado.perfil) router.replace("/comecar");
    // quem já usava antes dos planos começa o teste a partir de hoje
    if (estado?.perfil && !estado.inicioUso) marcarInicioUso(agoraEmSaoPaulo().data);
  }, [estado, router]);
  useEffect(() => {
    const abrir = () => {
      setUsado((u) => ({ ...u, mais: true }));
      setMais(true);
    };
    window.addEventListener(EVENTO_ABRIR_MAIS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_MAIS, abrir);
  }, []);
  if (!estado?.perfil) return <Carregando />;
  const tela = caminho.split("/")[1] ?? "hoje";
  const ativa = mais ? "mais" : lancar ? "lancar" : (GRUPO[tela] ?? "hoje");
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(92px+env(safe-area-inset-bottom))]">
        {TELAS_DO_MAIS.has(tela) && (
          <button
            type="button"
            onClick={() => {
              setUsado((u) => ({ ...u, mais: true }));
              setMais(true);
            }}
            aria-label="Voltar ao menu Mais"
            className="ml-2 inline-flex min-h-12 items-center gap-1 rounded-full px-2 pt-[env(safe-area-inset-top)] text-15 font-bold text-texto-2 active:bg-superficie-2"
          >
            <ChevronLeft aria-hidden className="size-5" /> Mais
          </button>
        )}
        {children}
      </div>
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
      {estado.consentimento?.versao !== LEGAL.versao && <AceiteTermos jaAceitouAntes={!!estado.consentimento} />}
      {usado.lancar && <MenuLancar aberto={lancar} onFechar={() => setLancar(false)} estado={estado} />}
      {usado.mais && (
        <MenuMais
          aberto={mais}
          onFechar={() => setMais(false)}
          usaProducao={abaExtraDoPerfil(estado.perfil) === "producao"}
          preferencias={estado.preferencias}
          plano={(() => {
            const sp = situacaoAtual(estado);
            const a = estado.assinatura;
            if (sp.emTeste) return { nome: "Teste grátis do Individual", detalhe: sp.diasDeTeste === 1 ? "Último dia" : `${sp.diasDeTeste} dias restantes`, emTeste: true, progressoTeste: (DIAS_TESTE - sp.diasDeTeste) / DIAS_TESTE };
            if (a && sp.plano !== "gratis") return { nome: `Plano ${PLANOS[sp.plano].nome}`, detalhe: `Pago até ${a.pagoAte.slice(8, 10)}/${a.pagoAte.slice(5, 7)}`, emTeste: false };
            return { nome: "Plano Grátis", detalhe: "Histórico, PDF e metas no Individual", emTeste: false };
          })()}
        />
      )}
    </>
  );
}
