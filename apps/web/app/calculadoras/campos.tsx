"use client";

import { formatarReais, lerReais, type ResultadoDireito } from "@ponto-pro/core";
import { CampoNumero, Chip, cx } from "@ponto-pro/ui";
import { useState } from "react";

/** Campo em reais: guarda o texto digitado e devolve centavos (0 se vazio). */
export function useReais(inicial: number) {
  const [texto, setTexto] = useState(inicial ? (inicial / 100).toFixed(2).replace(".", ",") : "");
  return { texto, setTexto, centavos: lerReais(texto) ?? 0 };
}

export function CampoReais({ rotulo, campo, ajuda }: { rotulo: string; campo: ReturnType<typeof useReais>; ajuda?: string }) {
  return <CampoNumero rotulo={rotulo} prefixo="R$" valor={campo.texto} onChange={campo.setTexto} placeholder="0,00" ajuda={ajuda} />;
}

/** Escolha entre poucas opções, em pílulas. */
export function Opcoes<T extends string | number>({ rotulo, opcoes, valor, onChange }: { rotulo: string; opcoes: { valor: T; texto: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-1.5 text-corpo font-bold">{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <Chip key={String(o.valor)} type="button" selecionado={o.valor === valor} aria-pressed={o.valor === valor} onClick={() => onChange(o.valor)}>
            {o.texto}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

/** Caixa da calculadora: os campos em cima, o resultado embaixo. */
export function Caixa({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-5 rounded-painel bg-superficie-2 p-5 sm:p-6">{children}</div>;
}

/** Resultado com a conta linha por linha: ganhos, descontos e o que é só informação (FGTS). */
export function Resultado({ r, rotulo = "Você recebe", extra }: { r: ResultadoDireito; rotulo?: string; extra?: React.ReactNode }) {
  const tom = { ganho: "", desconto: "text-erro-texto", info: "text-texto-2" } as const;
  return (
    <section aria-live="polite" aria-label="Resultado" className="flex flex-col gap-4 border-t border-borda-forte pt-5">
      <p className="flex flex-col">
        <span className="text-apoio font-bold">{rotulo}</span>
        <span className="display numeros text-[clamp(2.2rem,10vw,3rem)] leading-none">{formatarReais(r.liquido)}</span>
        {r.descontos > 0 && (
          <span className="numeros text-apoio text-texto-2">
            {formatarReais(r.bruto)} brutos, menos {formatarReais(r.descontos)} de descontos
          </span>
        )}
      </p>
      {extra}
      <ul className="flex flex-col divide-y divide-borda rounded-2xl bg-superficie px-4">
        {r.linhas.map((l) => (
          <li key={l.descricao} className={cx("flex flex-col gap-0.5 py-3", tom[l.tipo])}>
            <span className="flex items-baseline justify-between gap-3 text-apoio font-bold">
              {l.descricao}
              <span className="numeros whitespace-nowrap">
                {l.tipo === "desconto" ? "−" : ""}
                {formatarReais(l.valor)}
              </span>
            </span>
            <span className="numeros text-legenda text-texto-2">{l.conta}</span>
          </li>
        ))}
      </ul>
      {r.avisos.length > 0 && (
        <ul className="flex flex-col gap-1 text-apoio text-texto-2">
          {r.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <p className="text-legenda text-texto-2">Estimativa com as regras gerais da CLT. O que vale é o seu contracheque.</p>
    </section>
  );
}
