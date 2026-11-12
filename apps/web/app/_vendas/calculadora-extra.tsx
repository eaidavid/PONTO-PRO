"use client";

import { formatarReais, PLANOS } from "@ponto-pro/core";
import gsap from "gsap";
import { useEffect, useId, useRef, useState } from "react";

/** Adicional mínimo de hora extra em dia comum (Constituição, art. 7º, XVI). */
const ADICIONAL = 1.5;
const SEMANAS_NO_MES = 4;

/** Valor em reais que "roda" até o número novo. O leitor de tela recebe só o valor final. */
function NumeroAnimado({ centavos, className }: { centavos: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const atual = useRef({ v: centavos });
  const [inicial] = useState(() => formatarReais(centavos));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      atual.current.v = centavos;
      el.textContent = formatarReais(centavos);
      return;
    }
    const t = gsap.to(atual.current, {
      v: centavos,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = formatarReais(Math.round(atual.current.v));
      },
    });
    return () => {
      t.kill();
    };
  }, [centavos]);
  return (
    <>
      <span ref={ref} aria-hidden className={className}>{inicial}</span>
      <span className="sr-only">{formatarReais(centavos)}</span>
    </>
  );
}

/**
 * A prova que o visitante confere sozinho: quanto valem as horas extras dele.
 * É conta simples e declarada (hora × 1,5 × horas por semana × 4 semanas), não promessa de ganho.
 */
export function CalculadoraExtra() {
  const [hora, setHora] = useState(2500);
  const [extras, setExtras] = useState(2);
  const idHora = useId();
  const idExtras = useId();

  const umaExtra = Math.round(hora * ADICIONAL);
  const porMes = umaExtra * extras * SEMANAS_NO_MES;
  const porAno = porMes * 12;
  const plano = PLANOS.individual.preco;

  const faixa = "h-12 w-full cursor-pointer accent-[color:var(--extra)]";

  return (
    <div className="flex flex-col gap-6 rounded-[28px] bg-superficie-2 p-5 sm:p-7">
      <div className="flex flex-col gap-1">
        <label htmlFor={idHora} className="flex items-baseline justify-between gap-3 text-17 font-bold">
          Seu ganho por hora
          <span className="numeros text-20 whitespace-nowrap">{formatarReais(hora)}</span>
        </label>
        <input
          id={idHora}
          type="range"
          min={800}
          max={8000}
          step={50}
          value={hora}
          onChange={(e) => setHora(Number(e.target.value))}
          aria-valuetext={formatarReais(hora)}
          className={faixa}
        />
        <p className="text-15 text-texto-2">Ganha por mês? Divida o salário por 220.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={idExtras} className="flex items-baseline justify-between gap-3 text-17 font-bold">
          Horas extras por semana
          <span className="numeros text-20 whitespace-nowrap">{extras}h</span>
        </label>
        <input
          id={idExtras}
          type="range"
          min={1}
          max={15}
          step={1}
          value={extras}
          onChange={(e) => setExtras(Number(e.target.value))}
          aria-valuetext={`${extras} horas`}
          className={faixa}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-borda-forte pt-5">
        <p className="flex flex-col">
          <span className="text-17 font-bold">Suas horas extras valem, por mês</span>
          <NumeroAnimado centavos={porMes} className="display text-[clamp(2.6rem,12vw,4rem)] leading-none text-extra-texto" />
        </p>
        <p className="numeros text-20">
          Em um ano são <b><NumeroAnimado centavos={porAno} /></b>.
        </p>
        <p className="numeros rounded-2xl bg-superficie px-4 py-3 text-17">
          Uma hora extra sua vale <b><NumeroAnimado centavos={umaExtra} /></b>. O Pingou Individual custa{" "}
          <b>{formatarReais(plano)}</b> por mês.
        </p>
        <p className="text-15 text-texto-2">
          Conta com o adicional mínimo de 50% e {SEMANAS_NO_MES} semanas por mês. É uma estimativa: o seu acordo pode pagar mais.
        </p>
      </div>
    </div>
  );
}
