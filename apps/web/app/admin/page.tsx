"use client";

import { formatarReais } from "@ponto-pro/core";
import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "../../lib/admin-cliente";
import { Cabecalho, Estado, Numero, Recarregar } from "./comum";

interface Resumo {
  contas: number;
  novas7: number;
  ativas7: number;
  ativas30: number;
  testeTerminado: number;
  testeVirouPago: number;
  emTeste: number;
  suporteAberto: number;
  errosHoje: number;
  novasPorDia: { dia: string; total: number }[];
  assinantes: number;
  anuais: number;
  cortesias: number;
  atrasadas: number;
  receita: number;
  metas: { comecos: number; ativados: number; contas7: number; voltaram7: number } | null;
}

/** Metas iniciais do beta. Com menos de 10 casos, o número ainda não diz nada. */
function Meta({ rotulo, feitos, total, alvo, explica }: { rotulo: string; feitos: number; total: number; alvo: number; explica: string }) {
  const taxa = total ? feitos / total : 0;
  const situacao = total < 10 ? "poucos" : taxa >= alvo ? "ok" : "abaixo";
  const chip = { poucos: "bg-superficie-2 text-texto-2", ok: "bg-primaria-suave text-primaria-forte", abaixo: "bg-erro-suave text-erro-texto" }[situacao];
  const texto = { poucos: "poucos dados", ok: "na meta", abaixo: "abaixo da meta" }[situacao];
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-corpo font-bold">{rotulo}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-legenda font-bold ${chip}`}>{texto}</span>
      </div>
      <p className="numeros text-apoio">
        <b className="text-destaque">{pct(feitos, total)}</b> <span className="text-texto-2">({feitos} de {total}) · meta {Math.round(alvo * 100)}%</span>
      </p>
      <p className="text-legenda text-texto-2">{explica}</p>
    </li>
  );
}

const pct = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toLocaleString("pt-BR")}%` : "—");

/** Contas novas por dia: uma série, uma cor, barras finas com hover e tabela para leitor de tela. */
function GraficoNovas({ dias }: { dias: Resumo["novasPorDia"] }) {
  const [foco, setFoco] = useState<number | null>(null);
  const max = Math.max(1, ...dias.map((d) => d.total));
  const atual = foco !== null ? dias[foco] : null;
  return (
    <section aria-labelledby="t-novas" className="flex flex-col gap-3 rounded-cartao border border-borda bg-superficie p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="t-novas" className="text-corpo font-bold">Contas novas por dia, últimos 30 dias</h2>
        <span className="numeros text-apoio text-texto-2" aria-live="polite">
          {atual ? `${atual.dia.slice(8, 10)}/${atual.dia.slice(5, 7)}: ${atual.total} ${atual.total === 1 ? "conta" : "contas"}` : `máximo ${max} por dia`}
        </span>
      </div>
      <div aria-hidden className="relative flex h-32 items-end gap-0.5 border-b border-borda" onMouseLeave={() => setFoco(null)}>
        {dias.map((d, i) => (
          <div key={d.dia} className="flex h-full flex-1 cursor-default items-end" onMouseEnter={() => setFoco(i)} onTouchStart={() => setFoco(i)}>
            <div
              className={foco === i ? "w-full rounded-t-[4px] bg-primaria-forte" : "w-full rounded-t-[4px] bg-primaria"}
              style={{ height: `${d.total ? Math.max(4, (d.total / max) * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="numeros flex justify-between text-legenda text-texto-2">
        <span>{dias[0]?.dia.slice(8, 10)}/{dias[0]?.dia.slice(5, 7)}</span>
        <span>hoje</span>
      </div>
      <table className="sr-only">
        <caption>Contas novas por dia</caption>
        <tbody>
          {dias.map((d) => (
            <tr key={d.dia}><th scope="row">{d.dia}</th><td>{d.total}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function VisaoGeral() {
  const { dados: r, erro, carregando, recarregar } = useAdmin<Resumo>("/api/admin/resumo");
  return (
    <>
      <Cabecalho titulo="Visão geral" descricao="Como o Pingou está hoje. Números de contas criadas; quem usa sem conta não aparece aqui." acao={<Recarregar onClick={recarregar} carregando={carregando} />} />
      <Estado erro={erro} carregando={carregando && !r} />
      {r && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero rotulo="Contas" valor={r.contas.toLocaleString("pt-BR")} apoio={`+${r.novas7} nos últimos 7 dias`} />
            <Numero rotulo="Ativas em 7 dias" valor={r.ativas7.toLocaleString("pt-BR")} apoio={`${pct(r.ativas7, r.contas)} das contas; ${r.ativas30} em 30 dias`} />
            <Numero rotulo="Assinantes" valor={r.assinantes} apoio={`${r.anuais} anuais; ${r.cortesias} cortesias`} />
            <Numero rotulo="Receita por mês" valor={formatarReais(r.receita)} apoio="anuidades divididas por 12, sem cortesia" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
            <GraficoNovas dias={r.novasPorDia} />
            <section className="flex flex-col gap-2 rounded-cartao border border-borda bg-superficie p-4">
              <h2 className="text-corpo font-bold">Teste para pago</h2>
              <p className="display numeros text-titulo-1 leading-none">{pct(r.testeVirouPago, r.testeTerminado)}</p>
              <p className="text-apoio text-texto-2">
                {r.testeVirouPago} de {r.testeTerminado} contas que terminaram os 14 dias assinaram. {r.emTeste} estão no teste agora.
              </p>
            </section>
          </div>
          {r.metas && (
            <section aria-labelledby="t-metas" className="rounded-cartao border border-borda bg-superficie p-4">
              <h2 id="t-metas" className="text-corpo font-bold">Metas do beta</h2>
              <ul className="divide-y divide-borda">
                <Meta rotulo="Bateram o 1º ponto no mesmo dia" feitos={r.metas.ativados} total={r.metas.comecos} alvo={0.6} explica="Aparelhos que terminaram o começo nos últimos 30 dias e bateram o ponto em até 24 horas." />
                <Meta rotulo="Ainda usam no 7º dia" feitos={r.metas.voltaram7} total={r.metas.contas7} alvo={0.35} explica="Contas criadas há 7 a 37 dias que usaram o app 7 dias ou mais depois de criar." />
                <Meta rotulo="Passaram do teste para o pago" feitos={r.testeVirouPago} total={r.testeTerminado} alvo={0.05} explica="Contas que terminaram os 14 dias de teste e assinaram." />
              </ul>
            </section>
          )}
          <section aria-labelledby="t-atencao" className="rounded-cartao border border-borda bg-superficie p-4">
            <h2 id="t-atencao" className="mb-2 text-corpo font-bold">Precisa de atenção</h2>
            <ul className="flex flex-wrap gap-2 text-apoio">
              <li><Link href="/admin/suporte" className="inline-flex min-h-10 items-center rounded-full bg-superficie-2 px-4 font-bold">{r.suporteAberto} pedidos de suporte abertos</Link></li>
              <li><Link href="/admin/assinaturas?aba=atrasada" className="inline-flex min-h-10 items-center rounded-full bg-superficie-2 px-4 font-bold">{r.atrasadas} assinaturas atrasadas</Link></li>
              <li><Link href="/admin/saude" className="inline-flex min-h-10 items-center rounded-full bg-superficie-2 px-4 font-bold">{r.errosHoje} erros nas últimas 24h</Link></li>
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
