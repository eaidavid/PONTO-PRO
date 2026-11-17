"use client";

import { cx } from "@ponto-pro/ui";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { dataCurtaBr } from "../../lib/admin-cliente";

export function Cabecalho({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="display text-titulo-2">{titulo}</h1>
        {descricao && <p className="max-w-[64ch] text-apoio text-texto-2">{descricao}</p>}
      </div>
      {acao}
    </header>
  );
}

export function Recarregar({ onClick, carregando }: { onClick: () => void; carregando: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={carregando} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-borda bg-superficie px-4 text-apoio font-bold disabled:opacity-60">
      <RefreshCw aria-hidden className={cx("size-4", carregando && "animate-spin")} /> Atualizar
    </button>
  );
}

export function Numero({ rotulo, valor, apoio, tom }: { rotulo: string; valor: ReactNode; apoio?: ReactNode; tom?: "atencao" }) {
  return (
    <div className={cx("flex flex-col gap-1 rounded-cartao border bg-superficie p-4", tom === "atencao" ? "border-extra" : "border-borda")}>
      <span className="text-apoio text-texto-2">{rotulo}</span>
      <span className="display numeros text-titulo-1 leading-none">{valor}</span>
      {apoio && <span className="text-legenda text-texto-2">{apoio}</span>}
    </div>
  );
}

export function Estado({ erro, carregando, vazio, textoVazio }: { erro: string | null; carregando: boolean; vazio?: boolean; textoVazio?: string }) {
  if (erro) return <p role="alert" className="rounded-cartao bg-erro-suave p-4 text-apoio text-erro-texto">{erro}</p>;
  if (carregando) return <p role="status" className="p-4 text-apoio text-texto-2">Carregando…</p>;
  if (vazio) return <p className="rounded-cartao border border-dashed border-borda-forte p-6 text-center text-apoio text-texto-2">{textoVazio ?? "Nada por aqui ainda."}</p>;
  return null;
}

export function Abas<T extends string>({ opcoes, valor, onChange }: { opcoes: { id: T; rotulo: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mb-4 flex flex-wrap gap-1">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === valor}
          onClick={() => onChange(o.id)}
          className={cx("min-h-10 rounded-full px-4 text-apoio font-bold", o.id === valor ? "bg-texto text-fundo" : "bg-superficie-2 text-texto-2")}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Tabela com rolagem lateral no celular. */
export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-cartao border border-borda bg-superficie">
      <table className="w-full min-w-[640px] border-collapse text-apoio">
        <thead>
          <tr className="bg-superficie-2 text-left text-legenda text-texto-2">
            {cabecalho.map((c) => (
              <th key={c} scope="col" className="px-3 py-2.5 font-bold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borda [&_td]:px-3 [&_td]:py-2.5">{children}</tbody>
      </table>
    </div>
  );
}

/** Situação em palavras: "Pro mensal", "Cortesia até 02/12", "Teste (5 dias)", "Grátis". */
export function situacao(p: { status: string | null; ciclo: string | null; pago_ate: string | null; provedor: string | null; inicio_uso?: string | null; inicioUso?: string | null }): string {
  const hoje = new Date().toISOString().slice(0, 10);
  if (p.status && p.pago_ate && p.pago_ate >= hoje && p.status !== "cancelada") {
    if (p.provedor === "cortesia") return `Cortesia até ${dataCurtaBr(p.pago_ate)}`;
    return `Pro ${p.ciclo === "anual" ? "anual" : "mensal"}${p.status === "atrasada" ? " (atrasada)" : ""}`;
  }
  const inicio = p.inicio_uso ?? p.inicioUso;
  if (inicio) {
    const resta = 14 - Math.floor((Date.parse(hoje) - Date.parse(inicio)) / 86_400_000);
    if (resta > 0) return `Teste (${resta} ${resta === 1 ? "dia" : "dias"})`;
  }
  return p.status === "cancelada" ? "Cancelou" : "Grátis";
}

