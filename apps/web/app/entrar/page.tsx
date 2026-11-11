"use client";

import { Banner, BotaoPrincipal, CampoTexto } from "@ponto-pro/ui";
import { ChevronLeft, Cloud, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Destino, lerDestino } from "../../lib/nuvem/destino";
import { NUVEM_CONFIGURADA } from "../../lib/nuvem/status";
import { MARCA } from "../../lib/marca";

/** Erros do servidor em português simples. */
function explicar(e: unknown): string {
  const m = e instanceof Error ? e.message.toLowerCase() : "";
  if (!navigator.onLine) return "Sem internet agora. Conecte e tente de novo.";
  if (m.includes("expired") || m.includes("invalid") || m.includes("token")) return "Código errado ou vencido. Confira ou peça outro.";
  if (m.includes("rate") || m.includes("seconds")) return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (m.includes("phone") || m.includes("sms")) return "Não deu para mandar SMS para esse número. Tente com e-mail.";
  return "Não deu certo agora. Tente de novo em instantes.";
}

/** Entrar ou criar conta: um código chega por SMS ou e-mail. Sem senha para esquecer. */
export default function Entrar() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState<Destino | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedirCodigo() {
    const d = lerDestino(texto);
    if (!d) {
      setErro("Digite o celular com DDD (ex.: 11 98765-4321) ou um e-mail.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const { enviarCodigo } = await import("../../lib/nuvem/supabase");
      await enviarCodigo(d);
      setDestino(d);
    } catch (e) {
      setErro(explicar(e));
    } finally {
      setEnviando(false);
    }
  }

  async function confirmar() {
    if (!destino) return;
    setErro(null);
    setEnviando(true);
    try {
      const { confirmarCodigo } = await import("../../lib/nuvem/supabase");
      await confirmarCodigo(destino, codigo);
      router.replace("/conta");
    } catch (e) {
      setErro(explicar(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-5 px-4 pb-8">
      <header className="pt-4">
        <Link href="/conta" className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-full px-2 text-15 font-bold active:bg-superficie-2">
          <ChevronLeft aria-hidden className="size-6" /> Conta
        </Link>
      </header>
      <div className="flex flex-col gap-2">
        <Cloud aria-hidden className="size-10 text-primaria-forte" />
        <h1 className="display text-32">{destino ? "Digite o código" : "Entrar ou criar conta"}</h1>
        <p className="text-17 text-texto-2">
          {destino
            ? `Mandamos um código de 6 números para ${destino.tipo === "email" ? destino.valor : "o seu celular"}.`
            : `Com uma conta, seus registros ficam guardados e aparecem se você trocar de celular. Sem senha: o ${MARCA.nome} manda um código.`}
        </p>
      </div>

      {!NUVEM_CONFIGURADA ? (
        <Banner tom="info" texto="As contas ainda não estão disponíveis. Seus dados continuam salvos neste celular." />
      ) : destino ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            confirmar();
          }}
        >
          <CampoTexto rotulo="Código" valor={codigo} onChange={setCodigo} inputMode="numeric" autoComplete="one-time-code" maxLength={8} autoFocus />
          {erro && <p role="alert" className="text-15 font-bold text-erro-texto">{erro}</p>}
          <BotaoPrincipal tamanho="g" type="submit" disabled={enviando || codigo.replace(/\D/g, "").length < 6}>
            {enviando ? "Conferindo…" : "Entrar"}
          </BotaoPrincipal>
          <BotaoPrincipal variante="fantasma" type="button" onClick={() => { setDestino(null); setCodigo(""); setErro(null); }}>
            Usar outro número ou e-mail
          </BotaoPrincipal>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            pedirCodigo();
          }}
        >
          <CampoTexto rotulo="Celular ou e-mail" valor={texto} onChange={setTexto} autoComplete="tel email" placeholder="(11) 98765-4321" autoFocus />
          {erro && <p role="alert" className="text-15 font-bold text-erro-texto">{erro}</p>}
          <BotaoPrincipal tamanho="g" icone={Send} type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? "Enviando…" : "Mandar código"}
          </BotaoPrincipal>
        </form>
      )}

      <p className="flex gap-2 text-13 text-texto-2">
        <ShieldCheck aria-hidden className="size-4 shrink-0" />
        <span>
          Usamos o número ou e-mail só para entrar e guardar seus dados. Veja a <Link href="/privacidade" className="font-bold underline">Política de privacidade</Link>.
        </span>
      </p>
    </main>
  );
}
