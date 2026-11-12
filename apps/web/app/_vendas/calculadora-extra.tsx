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

function minutosPorExtenso(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function horasPorExtenso(meiasHoras: number): string {
  return minutosPorExtenso(meiasHoras * 30);
}

/**
 * A prova que o visitante confere sozinho: quanto valem as horas extras dele.
 * Por semana, de meia em meia hora, a partir de 30 minutos (muita gente faz pouca hora extra).
 * É conta simples e declarada (hora × 1,5 × horas por semana × 4 semanas), não promessa de ganho.
 */
export function CalculadoraExtra() {
  const [hora, setHora] = useState(2500);
  /** Horas extras por semana, em meias horas (4 = 2h). */
  const [meias, setMeias] = useState(4);
  const idHora = useId();
  const idExtras = useId();

  const umaExtra = Math.round(hora * ADICIONAL);
  const porMes = Math.round((umaExtra * meias * SEMANAS_NO_MES) / 2);
  const porAno = porMes * 12;
  const plano = PLANOS.individual.preco;
  /** Minutos de hora extra que pagam a mensalidade. */
  const paga = Math.ceil((plano / umaExtra) * 60);

  const faixa = "h-12 w-full cursor-pointer accent-[color:var(--extra)]";
  const valor = "numeros text-20 whitespace-nowrap";

  return (
    <div className="flex flex-col gap-6 rounded-[28px] bg-superficie-2 p-5 sm:p-7">
      <div className="flex flex-col gap-1">
        <label htmlFor={idHora} className="flex items-baseline justify-between gap-3 text-17 font-bold">
          Seu ganho por hora
          <span className={valor}>{formatarReais(hora)}</span>
        </label>
        <input
          id={idHora}
          type="range"
          min={700}
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
          <span className={valor}>{horasPorExtenso(meias)}</span>
        </label>
        <input
          id={idExtras}
          type="range"
          min={1}
          max={30}
          step={1}
          value={meias}
          onChange={(e) => setMeias(Number(e.target.value))}
          aria-valuetext={horasPorExtenso(meias)}
          className={faixa}
        />
        <p className="text-15 text-texto-2">De meia em meia hora, a partir de 30 minutos.</p>
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
          O Pingou Individual custa <b>{formatarReais(plano)}</b> por mês. Na sua conta, ele se paga com{" "}
          <b>{minutosPorExtenso(paga)}</b> de hora extra.
        </p>
        <p className="text-15 text-texto-2">
          Conta com o adicional mínimo de 50% e {SEMANAS_NO_MES} semanas por mês. É uma estimativa: o seu acordo pode pagar mais.
        </p>
      </div>
    </div>
  );
}
