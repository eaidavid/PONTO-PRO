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

/**
 * A prova que o visitante confere sozinho: quanto valem os minutos a mais de cada dia.
 * Em minutos por dia (e não horas por semana) porque é assim que a hora extra costuma acontecer:
 * um pouco depois do horário, quase todo dia.
 * É conta simples e declarada (hora × 1,5 × minutos × dias × 4 semanas), não promessa de ganho.
 */
export function CalculadoraExtra() {
  const [hora, setHora] = useState(2500);
  const [minutos, setMinutos] = useState(20);
  const [dias, setDias] = useState(5);
  const idHora = useId();
  const idMinutos = useId();

  const umaExtra = Math.round(hora * ADICIONAL);
  const porMes = Math.round((umaExtra * minutos * dias * SEMANAS_NO_MES) / 60);
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
        <label htmlFor={idMinutos} className="flex items-baseline justify-between gap-3 text-17 font-bold">
          Tempo a mais por dia
          <span className={valor}>{minutosPorExtenso(minutos)}</span>
        </label>
        <input
          id={idMinutos}
          type="range"
          min={5}
          max={180}
          step={5}
          value={minutos}
          onChange={(e) => setMinutos(Number(e.target.value))}
          aria-valuetext={minutosPorExtenso(minutos)}
          className={faixa}
        />
      </div>

      <div role="group" aria-label="Dias de trabalho por semana" className="flex items-center justify-between gap-3">
        <span className="text-17 font-bold">Dias por semana</span>
        <span className="flex gap-2">
          {[5, 6].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dias === d}
              onClick={() => setDias(d)}
              className={
                dias === d
                  ? "numeros min-h-12 min-w-14 rounded-full bg-texto px-4 text-17 font-bold text-fundo"
                  : "numeros borda min-h-12 min-w-14 rounded-full border-borda-forte! bg-superficie px-4 text-17 font-bold"
              }
            >
              {d}
            </button>
          ))}
        </span>
      </div>

      <div className="flex flex-col gap-4 border-t border-borda-forte pt-5">
        <p className="flex flex-col">
          <span className="text-17 font-bold">Esse tempo a mais vale, por mês</span>
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
