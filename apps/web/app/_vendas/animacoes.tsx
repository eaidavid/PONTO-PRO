"use client";

import { formatarReais } from "@ponto-pro/core";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";

/**
 * Movimento da página de vendas (GSAP + SplitText + ScrollTrigger).
 * Tudo é ligado por atributos data-*, para a página continuar sendo HTML pronto do servidor:
 * - data-heroi / data-assinatura / data-heroi-item / data-heroi-demo: entrada da abertura ("pingou." cai como gota e o título sobe)
 * - data-titulo="secao": as palavras do título sobem ao entrar na tela
 * - data-revelar: o bloco sobe e aparece; data-revelar-grupo: os filhos (ou o seletor informado) em sequência
 * - data-lado: colunas que entram pelos lados; data-barra: barra de progresso que enche
 * - data-contar: valor em centavos que conta do zero; data-faixa: faixa de profissões que corre sem parar
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

      for (const el of todos("[data-titulo='secao']")) {
        SplitText.create(el, {
          type: "words",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.words, { yPercent: 60, opacity: 0, duration: 0.55, ease: "power3.out", stagger: 0.04, scrollTrigger: aoEntrar(el, "top 88%") });
          },
        });
      }

      for (const el of todos("[data-revelar]")) {
        gsap.from(el, { y: 36, opacity: 0, duration: 0.7, ease: "power3.out", scrollTrigger: aoEntrar(el) });
      }

      for (const el of todos("[data-revelar-grupo]")) {
        const seletor = el.dataset.revelarGrupo;
        const itens = seletor ? el.querySelectorAll(seletor) : el.children;
        gsap.from(itens, { y: 28, opacity: 0, duration: 0.55, ease: "power3.out", stagger: 0.08, scrollTrigger: aoEntrar(el) });
      }

      for (const el of todos("[data-lado]")) {
        const x = el.dataset.lado === "sem" ? -28 : 28;
        gsap
          .timeline({ scrollTrigger: aoEntrar(el) })
          .from(el, { x, opacity: 0, duration: 0.6, ease: "power3.out" })
          .from(el.querySelectorAll("li"), { x: x / 2, opacity: 0, duration: 0.4, ease: "power2.out", stagger: 0.07 }, "-=0.3");
      }

      for (const el of todos("[data-barra]")) {
        const barra = el.querySelector("[role='progressbar'] > div");
        if (barra) gsap.from(barra, { width: "0%", duration: 1.3, ease: "power2.out", scrollTrigger: aoEntrar(el, "top 75%") });
      }

      for (const el of todos("[data-contar]")) {
        const fim = Number(el.dataset.contar);
        const conta = { v: 0 };
        gsap.to(conta, {
          v: fim,
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: aoEntrar(el),
          onStart: () => { el.textContent = formatarReais(0); },
          onUpdate: () => { el.textContent = formatarReais(Math.round(conta.v)); },
        });
      }

      for (const el of todos("[data-faixa]")) {
        const paraEsquerda = el.dataset.faixa !== "direita";
        gsap.fromTo(el, { xPercent: paraEsquerda ? 0 : -50 }, { xPercent: paraEsquerda ? -50 : 0, duration: 45, ease: "none", repeat: -1 });
      }

      // no computador, o celular da abertura sobe um pouco mais devagar que a página
      const mmLargo = gsap.matchMedia();
      mmLargo.add("(min-width: 768px)", () => {
        const demo = heroi?.querySelector("[data-heroi-paralaxe]");
        if (heroi && demo) gsap.to(demo, { yPercent: -7, ease: "none", scrollTrigger: { trigger: heroi, start: "top top", end: "bottom top", scrub: true } });
      });

      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      return () => mmLargo.revert();
    });

    return () => mm.revert();
  }, []);

  return null;
}
