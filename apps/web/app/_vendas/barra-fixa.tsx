"use client";

import { DIAS_TESTE } from "@ponto-pro/core";
import { cx } from "@ponto-pro/ui";
import { useEffect, useState } from "react";
import { useEstado } from "../../lib/estado";
import { LinkMedido } from "./link-medido";

/**
 * Barra com o botão de começar, presa no rodapé do celular.
 * Aparece depois que a abertura sai da tela e some ao chegar nos planos (dali em diante a página já tem botões).
 * Assim sempre há um botão à mão no trecho longo do meio da página.
 */
export function BarraFixa() {
  const jaUsa = !!useEstado()?.perfil;
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const heroi = document.querySelector("[data-heroi]");
    const planos = document.getElementById("planos");
    if (!heroi || !planos) return;
    let pedido = 0;
    const conferir = () => {
      pedido = 0;
      const passouAbertura = heroi.getBoundingClientRect().bottom < 0;
      const chegouNosPlanos = planos.getBoundingClientRect().top < window.innerHeight * 0.85;
      setVisivel(passouAbertura && !chegouNosPlanos);
    };
    const aoRolar = () => {
      if (!pedido) pedido = requestAnimationFrame(conferir);
    };
    conferir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      cancelAnimationFrame(pedido);
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, []);

  return (
    <div
      className={cx(
        "fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-12px_rgb(0_0_0/0.25)] transition-[translate,visibility] duration-200 md:hidden motion-reduce:transition-none",
        visivel ? "visible translate-y-0" : "invisible translate-y-full",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-15 leading-tight font-bold">
          {jaUsa ? "Você já usa o Pingou" : `${DIAS_TESTE} dias grátis, sem cartão`}
        </p>
        <LinkMedido
          href={jaUsa ? "/hoje" : "/comecar"}
          secao="barra-fixa"
          className="sombra-botao inline-flex min-h-12 shrink-0 items-center rounded-full bg-primaria px-6 text-17 font-bold text-sobre-primaria"
        >
          {jaUsa ? "Abrir o app" : "Começar"}
        </LinkMedido>
      </div>
    </div>
  );
}
