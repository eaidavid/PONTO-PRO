"use client";

import { divisorDaSemana, formatarReais, valorDaHoraDoSalario } from "@ponto-pro/core";
import { CampoNumero } from "@ponto-pro/ui";
import { useState } from "react";
import { CampoReais, Caixa, Opcoes, useReais } from "../campos";

const horas = (t: string) => {
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function CalculadoraHoraExtra() {
  const salario = useReais(300_000);
  const [semana, setSemana] = useState(44);
  const [extras50, setExtras50] = useState("10");
  const [extras100, setExtras100] = useState("0");
  const divisor = divisorDaSemana(semana);
  const v = valorDaHoraDoSalario(salario.centavos, divisor);
  const total50 = Math.round(v.extra * horas(extras50));
  const total100 = Math.round(v.extraDomingo * horas(extras100));
  const total = total50 + total100;

  return (
    <Caixa>
      <CampoReais rotulo="Seu salário por mês" campo={salario} ajuda="O salário da carteira, sem descontos." />
      <Opcoes
        rotulo="Horas na semana"
        valor={semana}
        onChange={setSemana}
        opcoes={[
          { valor: 44, texto: "44h" },
          { valor: 40, texto: "40h" },
          { valor: 36, texto: "36h" },
          { valor: 30, texto: "30h" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero rotulo="Horas extras em dia comum, no mês" valor={extras50} onChange={setExtras50} sufixo="h" ajuda="Pagas com pelo menos 50% a mais." />
        <CampoNumero rotulo="Horas em domingo e feriado, no mês" valor={extras100} onChange={setExtras100} sufixo="h" ajuda="Pagas com 100% a mais." />
      </div>
      <section aria-live="polite" aria-label="Resultado" className="flex flex-col gap-4 border-t border-borda-forte pt-5">
        <p className="flex flex-col">
          <span className="text-apoio font-bold">Suas horas extras valem, no mês</span>
          <span className="display numeros text-[clamp(2.2rem,10vw,3rem)] leading-none text-extra-texto">{formatarReais(total)}</span>
          <span className="numeros text-apoio text-texto-2">Em um ano: {formatarReais(total * 12)}</span>
        </p>
        <ul className="flex flex-col divide-y divide-borda rounded-2xl bg-superficie px-4 text-apoio">
          <li className="flex justify-between gap-3 py-3"><span>Sua hora normal (salário ÷ {divisor})</span><b className="numeros">{formatarReais(v.hora)}</b></li>
          <li className="flex justify-between gap-3 py-3"><span>Hora extra com 50%</span><b className="numeros">{formatarReais(v.extra)}</b></li>
          <li className="flex justify-between gap-3 py-3"><span>Hora com 100%</span><b className="numeros">{formatarReais(v.extraDomingo)}</b></li>
        </ul>
        <p className="text-legenda text-texto-2">Estimativa com os adicionais mínimos da lei. O seu acordo pode pagar mais. Sobre as extras ainda incide o reflexo no descanso semanal (DSR).</p>
      </section>
    </Caixa>
  );
}
