"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { dataCurtaBr, dataHora, haQuanto, useAdmin } from "../../../lib/admin-cliente";
import { Cabecalho, Estado, Recarregar } from "../comum";

interface Saude {
  erros: { mensagem: string; total: number; ultimo: string; url: string | null; agente: string | null }[];
  notificacoes: { dia: string; total: number }[];
  agendador: { tarefa: string; inicio: string; situacao: string; mensagem: string | null }[];
}

const aparelho = (ua: string | null) => (!ua ? "—" : /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "outro");
const tela = (url: string | null) => {
  try {
    return url ? new URL(url).pathname : "—";
  } catch {
    return url ?? "—";
  }
};

export default function PaginaSaude() {
  const { dados: s, erro, carregando, recarregar } = useAdmin<Saude>("/api/admin/saude");
  const ultimaRodada = s?.agendador[0];
  return (
    <>
      <Cabecalho titulo="Saúde" descricao="Erros que aparecem no celular das pessoas, avisos enviados e as rodadas do agendador." acao={<Recarregar onClick={recarregar} carregando={carregando} />} />
      <Estado erro={erro} carregando={carregando && !s} />
      {s && (
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <section aria-labelledby="t-erros" className="flex flex-col gap-2 rounded-cartao border border-borda bg-superficie p-4">
            <h2 id="t-erros" className="text-corpo font-bold">Erros do app, últimos 7 dias</h2>
            {!s.erros.length ? (
              <p className="flex items-center gap-2 text-apoio text-texto-2"><CircleCheck aria-hidden className="size-4 text-primaria" /> Nenhum erro registrado.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-borda">
                {s.erros.map((e) => (
                  <li key={e.mensagem} className="flex flex-col gap-0.5 py-2">
                    <span className="font-mono text-apoio">{e.mensagem}</span>
                    <span className="text-legenda text-texto-2">
                      {e.total}× · último {haQuanto(e.ultimo)} · {aparelho(e.agente)} · tela {tela(e.url)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="flex flex-col gap-4">
            <section aria-labelledby="t-agendador" className="flex flex-col gap-2 rounded-cartao border border-borda bg-superficie p-4">
              <h2 id="t-agendador" className="text-corpo font-bold">Agendador</h2>
              {!ultimaRodada ? (
                <p className="flex items-center gap-2 text-apoio text-erro-texto"><CircleAlert aria-hidden className="size-4" /> Nenhuma rodada registrada. Confira se a instalação do banco foi feita.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-apoio">
                  {s.agendador.map((r) => (
                    <li key={r.tarefa + r.inicio} className="flex items-start gap-2" title={r.mensagem ?? undefined}>
                      {r.situacao === "succeeded" ? <CircleCheck aria-label="deu certo" className="mt-0.5 size-4 shrink-0 text-primaria" /> : <CircleAlert aria-label="falhou" className="mt-0.5 size-4 shrink-0 text-erro-texto" />}
                      <span><b>{r.tarefa}</b> <span className="text-texto-2">{dataHora(r.inicio)}{r.situacao !== "succeeded" && r.mensagem ? `: ${r.mensagem}` : ""}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="t-avisos" className="flex flex-col gap-2 rounded-cartao border border-borda bg-superficie p-4">
              <h2 id="t-avisos" className="text-corpo font-bold">Avisos enviados por dia</h2>
              {!s.notificacoes.length ? (
                <p className="text-apoio text-texto-2">Nenhum aviso enviado nos últimos 7 dias.</p>
              ) : (
                <table className="text-apoio">
                  <tbody>
                    {s.notificacoes.map((n) => (
                      <tr key={n.dia}><th scope="row" className="py-1 pr-6 text-left font-normal text-texto-2">{dataCurtaBr(n.dia)}</th><td className="numeros font-bold">{n.total}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
