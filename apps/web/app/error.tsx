"use client";

import { BotaoPrincipal } from "@ponto-pro/ui";
import { RefreshCw } from "lucide-react";

/** Erro inesperado: mensagem calma e um jeito de tentar de novo. Os dados continuam no celular. */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-4 px-6">
      <h1 className="display text-32">Algo deu errado nesta tela</h1>
      <p className="text-17 text-texto-2">Seus registros continuam guardados no celular. Tente de novo.</p>
      <BotaoPrincipal tamanho="g" icone={RefreshCw} onClick={reset}>Tentar de novo</BotaoPrincipal>
    </main>
  );
}
