"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";

/**
 * Movimento da página de vendas (GSAP + SplitText + ScrollTrigger).
 * O único momento ensaiado é a abertura: "pingou." cai como gota e o título sobe.
 * Abaixo dela, tudo só aparece com um fade curto, para não cansar nem atrasar a leitura.
 * Ligado por atributos data-*, para a página continuar sendo HTML pronto do servidor:
 * - data-heroi / data-assinatura / data-titulo="heroi" / data-heroi-item / data-heroi-demo: a abertura
 * - data-titulo="secao" e data-revelar: o bloco aparece; data-revelar-grupo: os filhos em sequência
 * - data-barra: barra de progresso que enche
 * Com "reduzir movimento" ligado no aparelho, nada se mexe e tudo aparece no lugar.
 */
export function Animacoes() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const heroi = document.querySelector<HTMLElement>("[data-heroi]");
    const mm = gsap.matchMedia();
    const todos = <T extends HTMLElement = HTMLElement>(seletor: string) => gsap.utils.toArray<T>(seletor);
    const aoEntrar = (trigger: Element, start = "top 86%") => ({ trigger, start, once: true });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      heroi?.setAttribute("data-pronto", "");
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (heroi) {
        heroi.setAttribute("data-pronto", "");
        // a assinatura "Bateu o ponto, pingou." entra letra por letra e o "pingou." cai como gota
        const assinatura = heroi.querySelector<HTMLElement>("[data-assinatura]");
        if (assinatura) {
          SplitText.create(assinatura, {
            type: "words,chars",
            aria: "none",
            autoSplit: true,
            onSplit(self) {
              const gota = self.chars.filter((c) => c.closest("[data-gota]"));
              const resto = self.chars.filter((c) => !c.closest("[data-gota]"));
              return gsap
                .timeline()
                .from(resto, { yPercent: 70, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.02 })
                .from(gota, { yPercent: -160, opacity: 0, duration: 0.75, ease: "bounce.out", stagger: 0.045 }, "-=0.2");
            },
          });
        }
        const titulo = heroi.querySelector<HTMLElement>("[data-titulo='heroi']");
        if (titulo) {
          SplitText.create(titulo, {
            type: "words",
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.words, { yPercent: 60, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.05, delay: 0.2 });
            },
          });
        }
        gsap.from(heroi.querySelectorAll("[data-heroi-item]"), { y: 24, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.09, delay: 0.45 });
        gsap.from(heroi.querySelectorAll("[data-heroi-demo]"), { y: 70, opacity: 0, rotate: 3, duration: 0.95, ease: "power3.out", delay: 0.3 });
      }

      for (const el of todos("[data-titulo='secao'], [data-revelar]")) {
        gsap.from(el, { y: 14, opacity: 0, duration: 0.45, ease: "power2.out", scrollTrigger: aoEntrar(el) });
      }

      for (const el of todos("[data-revelar-grupo]")) {
        gsap.from(el.children, { y: 14, opacity: 0, duration: 0.4, ease: "power2.out", stagger: 0.06, scrollTrigger: aoEntrar(el) });
      }

      for (const el of todos("[data-barra]")) {
        const barra = el.querySelector("[role='progressbar'] > div");
        if (barra) gsap.from(barra, { width: "0%", duration: 1.1, ease: "power2.out", scrollTrigger: aoEntrar(el, "top 75%") });
      }

      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    });

    return () => mm.revert();
  }, []);

  return null;
}
