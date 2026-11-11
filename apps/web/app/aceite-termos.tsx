"use client";

import { BotaoPrincipal, Caixa } from "@ponto-pro/ui";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { salvarConsentimento } from "../lib/acoes";
import { LEGAL, MARCA } from "../lib/marca";

/** Textos dos links de aceite (usados no onboarding e na tela de atualização). */
export function TextoAceite() {
  return (
    <>
      Li e aceito os{" "}
      <Link href="/termos" target="_blank" className="font-bold text-primaria-forte underline underline-offset-4" onClick={(e) => e.stopPropagation()}>
        Termos de uso
      </Link>{" "}
      e a{" "}
      <Link href="/privacidade" target="_blank" className="font-bold text-primaria-forte underline underline-offset-4" onClick={(e) => e.stopPropagation()}>
        Política de privacidade
      </Link>
      .
    </>
  );
}

/** Quem já usava o app e ainda não aceitou esta versão vê esta tela uma vez. */
export function AceiteTermos({ jaAceitouAntes }: { jaAceitouAntes: boolean }) {
  const [aceito, setAceito] = useState(false);
  const [estatisticas, setEstatisticas] = useState(false);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="aceite-titulo" className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-fundo px-5 pt-[max(32px,env(safe-area-inset-top))] pb-8">
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5">
        <FileText aria-hidden className="size-10 text-primaria" />
        <h1 id="aceite-titulo" className="display text-32">{jaAceitouAntes ? "Atualizamos os termos" : "Antes de continuar"}</h1>
        <p className="text-17 text-texto-2">
          O {MARCA.nome} é controle pessoal e os valores são estimativas. Para seguir, confirme que leu os termos e a política de privacidade.
        </p>
        <div className="flex flex-col gap-4">
          <Caixa marcado={aceito} onChange={setAceito}>
            <TextoAceite />
          </Caixa>
          <Caixa marcado={estatisticas} onChange={setEstatisticas}>
            Quero ajudar a melhorar o app com estatísticas de uso, sem me identificar. (Opcional)
          </Caixa>
        </div>
        <div className="mt-auto pt-4">
          <BotaoPrincipal tamanho="g" disabled={!aceito} onClick={() => salvarConsentimento({ versao: LEGAL.versao, em: new Date().toISOString(), estatisticas })}>
            Continuar
          </BotaoPrincipal>
        </div>
      </div>
    </div>
  );
}
