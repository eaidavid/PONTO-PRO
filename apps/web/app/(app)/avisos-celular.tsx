"use client";

import { LinhaAjuste, useToast } from "@ponto-pro/ui";
import { Bell, BellOff, Download, Share, SquarePlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { instalarApp, usePodeInstalar } from "../../lib/instalar";
import { medir } from "../../lib/medir";
import type { SituacaoAvisos } from "../../lib/notificacoes/cliente";
import { useStatusNuvem } from "../../lib/nuvem/status";

const TEXTO: Record<SituacaoAvisos, string> = {
  "sem-suporte": "Este navegador não recebe avisos",
  "instalar-primeiro": "No iPhone, instale o app na tela inicial primeiro",
  bloqueado: "Bloqueados nos ajustes do celular",
  desligado: "Toque para ligar",
  ligado: "Ligados: saída esquecida e dia do pagamento",
};

function useSituacao() {
  const [s, setS] = useState<SituacaoAvisos | null>(null);
  useEffect(() => {
    import("../../lib/notificacoes/cliente").then((m) => m.situacaoAvisos().then(setS)).catch(() => setS("sem-suporte"));
  }, []);
  return [s, setS] as const;
}

/** Linha da tela Conta: liga e desliga os avisos deste celular. */
export function LinhaAvisos() {
  const [s, setS] = useSituacao();
  const { mostrar } = useToast();
  if (!s) return null;
  return (
    <LinhaAjuste
      icone={s === "ligado" ? Bell : BellOff}
      rotulo="Avisos no celular"
      valor={TEXTO[s]}
      onClick={async () => {
        if (s !== "ligado" && s !== "desligado") return;
        try {
          const m = await import("../../lib/notificacoes/cliente");
          const nova = s === "ligado" ? await m.desligarAvisos() : await m.ligarAvisos();
          setS(nova);
          medir("avisos", { situacao: nova });
          mostrar({ texto: nova === "ligado" ? "Avisos ligados" : nova === "bloqueado" ? "Avisos bloqueados no celular" : "Avisos desligados" });
        } catch {
          mostrar({ texto: "Não deu para mudar os avisos agora. Tente com internet." });
        }
      }}
    />
  );
}

function instalado() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function ehIphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
const fechado = (k: string) => {
  try {
    return localStorage.getItem(`pp-convite-${k}`) === "1";
  } catch {
    return false;
  }
};
const fechar = (k: string) => {
  try {
    localStorage.setItem(`pp-convite-${k}`, "1");
  } catch {
    /* sem armazenamento */
  }
};

/**
 * Convite na tela Hoje, depois do primeiro ponto batido:
 * 1) instalar o app na tela inicial (botão no Android, passo a passo no iPhone);
 * 2) com o app instalado e a conta criada, ligar os avisos.
 */
export function ConviteCelular({ jaBateuPonto }: { jaBateuPonto: boolean }) {
  const podeInstalar = usePodeInstalar();
  const nuvem = useStatusNuvem();
  const [s, setS] = useSituacao();
  const [tipo, setTipo] = useState<"instalar-android" | "instalar-iphone" | "avisos" | "conta" | null>(null);

  useEffect(() => {
    if (!jaBateuPonto || !s) return setTipo(null);
    if (!instalado()) {
      if (ehIphone() && !fechado("instalar")) return setTipo("instalar-iphone");
      if (podeInstalar && !fechado("instalar")) return setTipo("instalar-android");
      return setTipo(null);
    }
    if (s === "desligado" && nuvem.configurado && !fechado("avisos")) return setTipo(nuvem.usuario ? "avisos" : "conta");
    setTipo(null);
  }, [jaBateuPonto, s, podeInstalar, nuvem.configurado, nuvem.usuario]);

  if (!tipo) return null;
  const sair = (k: string) => {
    fechar(k);
    medir("convite_fechado", { tipo: k });
    setTipo(null);
  };
  const caixa = "relative flex flex-col gap-3 rounded-grande bg-primaria-suave p-4 pr-12";
  const botaoFechar = (k: string) => (
    <button type="button" aria-label="Agora não" onClick={() => sair(k)} className="absolute top-1 right-1 flex size-12 items-center justify-center rounded-full text-texto-2 active:bg-superficie">
      <X aria-hidden className="size-5" />
    </button>
  );

  if (tipo === "instalar-android") {
    return (
      <section aria-label="Instalar o app" className={caixa}>
        {botaoFechar("instalar")}
        <p className="text-corpo"><b>Deixe o Pingou na tela inicial.</b> Abre com um toque, mesmo sem internet, como um app.</p>
        <button
          type="button"
          onClick={async () => {
            medir("instalar", { origem: "hoje" });
            if (await instalarApp()) medir("instalado", { origem: "hoje" });
          }}
          className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-primaria px-5 text-corpo font-bold text-sobre-primaria"
        >
          <Download aria-hidden className="size-5" /> Instalar o app
        </button>
      </section>
    );
  }
  if (tipo === "instalar-iphone") {
    return (
      <section aria-label="Instalar o app no iPhone" className={caixa}>
        {botaoFechar("instalar")}
        <p className="text-corpo"><b>Deixe o Pingou na tela inicial do iPhone.</b> Assim ele abre como app e pode te avisar da saída.</p>
        <ol className="flex flex-col gap-2 text-apoio">
          <li className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-superficie font-bold">1</span>
            Toque em <Share aria-label="Compartilhar" className="size-5 text-primaria-forte" /> <b>Compartilhar</b>, embaixo no Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-superficie font-bold">2</span>
            Escolha <SquarePlus aria-hidden className="size-5 text-primaria-forte" /> <b>Adicionar à Tela de Início</b>
          </li>
        </ol>
      </section>
    );
  }
  if (tipo === "conta") {
    return (
      <section aria-label="Avisos no celular" className={caixa}>
        {botaoFechar("avisos")}
        <p className="text-corpo"><b>Quer um aviso quando esquecer a saída?</b> Crie sua conta: os dados ficam guardados e o Pingou pode te avisar.</p>
        <Link href="/entrar" className="inline-flex min-h-12 items-center self-start rounded-full bg-primaria px-5 text-corpo font-bold text-sobre-primaria">Criar conta</Link>
      </section>
    );
  }
  return (
    <section aria-label="Avisos no celular" className={caixa}>
      {botaoFechar("avisos")}
      <p className="text-corpo"><b>Ligar os avisos?</b> O Pingou lembra quando você esquecer de bater a saída e avisa no dia do pagamento.</p>
      <button
        type="button"
        onClick={async () => {
          try {
            const m = await import("../../lib/notificacoes/cliente");
            const nova = await m.ligarAvisos();
            setS(nova);
            medir("avisos", { situacao: nova, origem: "hoje" });
          } catch {
            /* sem rede: o convite continua */
          }
        }}
        className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-primaria px-5 text-corpo font-bold text-sobre-primaria"
      >
        <Bell aria-hidden className="size-5" /> Ligar avisos
      </button>
    </section>
  );
}
