"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";

/**
 * Animação dos títulos da página de vendas (GSAP + SplitText).
 * - Título principal: as letras sobem em sequência e a palavra "pingou." cai como uma gota.
 * - Demais títulos (data-titulo): as palavras sobem quando entram na tela.
 * Com "reduzir movimento" ligado no aparelho, nada se mexe.
 */
export function Animacoes() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const heroi = document.querySelector<HTMLElement>("[data-titulo='heroi']");
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: reduce)", () => {
      heroi?.setAttribute("data-pronto", "");
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (heroi) {
        SplitText.create(heroi, {
          type: "words,chars",
          autoSplit: true,
          onSplit(self) {
            heroi.setAttribute("data-pronto", "");
            const gota = self.chars.filter((c) => c.closest("[data-gota]"));
            const resto = self.chars.filter((c) => !c.closest("[data-gota]"));
            return gsap
              .timeline()
              .from(resto, { yPercent: 70, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.022 })
              .from(gota, { yPercent: -160, opacity: 0, duration: 0.75, ease: "bounce.out", stagger: 0.045 }, "-=0.25");
          },
        });
      }

      for (const el of gsap.utils.toArray<HTMLElement>("[data-titulo='secao']")) {
        SplitText.create(el, {
          type: "words",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.words, {
              yPercent: 60,
              opacity: 0,
              duration: 0.55,
              ease: "power3.out",
              stagger: 0.04,
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            });
          },
        });
      }
    });

    return () => mm.revert();
  }, []);

  return null;
}
