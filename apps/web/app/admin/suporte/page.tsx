"use client";

import { calcularPeriodo, formatarDuracao, formatarReais, type PerfilTrabalho, type DiaRegistro, type LancamentoProducao, type ItemProducao } from "@ponto-pro/core";
import { Copy, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import { dataCurtaBr, dataHora, haQuanto, pedirAdmin, useAdmin } from "../../../lib/admin-cliente";
import { Abas, Cabecalho, Estado, Recarregar } from "../comum";

type Status = "aberto" | "respondido" | "fechado";
interface Registros {
  periodo: { inicio: string; fim: string };
  perfil: PerfilTrabalho;
  registros: DiaRegistro[];
  lancamentos: LancamentoProducao[];
  itens: ItemProducao[];
}
interface Pedido {
  id: number;
  email: string | null;
  contato: string | null;
  mensagem: string;
  tecnico: Record<string, unknown>;
  registros: Registros | null;
  registros_expira: string | null;
  status: Status;
  criado_em: string;
}

/** Resumo técnico em uma linha legível. */
function linhaTecnica(t: Record<string, unknown>): string {
  if (!Object.keys(t).length) return "A pessoa não mandou informações técnicas.";
  const partes = [
    t.versao ? `app ${String(t.versao).slice(0, 7)}` : null,
    t.aparelho ? String(t.aparelho).replace(/Mozilla\/5\.0 \(|\).*$/g, "").slice(0, 60) : null,
    t.instalado ? "instalado" : "no navegador",
    t.plano ? `plano ${String(t.plano)}` : null,
    t.sincronizacao ? `sincronização: ${String(t.sincronizacao)}` : null,
    Array.isArray(t.ultimosErros) ? `${t.ultimosErros.length} erros recentes` : null,
  ];
  return partes.filter(Boolean).join(", ");
}

/** A mesma conta que a pessoa vê, dia a dia, com os registros que ela autorizou mandar. */
function VerRegistros({ r }: { r: Registros }) {
  const conta = useMemo(() => {
    try {
      return calcularPeriodo({ perfil: r.perfil, periodo: r.periodo, registros: r.registros, lancamentos: r.lancamentos, itens: r.itens });
    } catch {
      return null;
    }
  }, [r]);
  const porData = new Map(r.registros.map((d) => [d.data, d]));
  if (!conta) return <p className="text-apoio text-erro-texto">Não deu para refazer a conta com esses registros.</p>;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 text-apoio sm:grid-cols-4">
        <div><dt className="text-texto-2">Trabalhado</dt><dd className="numeros font-bold">{formatarDuracao(conta.horas.trabalhadoMin)}</dd></div>
        <div><dt className="text-texto-2">Hora extra</dt><dd className="numeros font-bold">{formatarDuracao(conta.horas.extraMin)}</dd></div>
        <div><dt className="text-texto-2">Bruto</dt><dd className="numeros font-bold">{formatarReais(conta.bruto)}</dd></div>
        <div><dt className="text-texto-2">Líquido</dt><dd className="numeros font-bold">{formatarReais(conta.liquido)}</dd></div>
      </dl>
      <div className="overflow-x-auto rounded-pequeno border border-borda">
        <table className="w-full min-w-[560px] text-apoio">
          <thead><tr className="bg-superficie-2 text-left text-legenda text-texto-2">{["Dia", "Entrada", "Almoço", "Volta", "Saída", "Trabalhado", "Extra"].map((c) => <th key={c} scope="col" className="px-2 py-1.5">{c}</th>)}</tr></thead>
          <tbody className="divide-y divide-borda [&_td]:px-2 [&_td]:py-1.5">
            {conta.dias.filter((d) => d.registrado || d.trabalhadoMin > 0).map((d) => {
              const m = porData.get(d.data)?.marcacoes ?? {};
              return (
                <tr key={d.data} className="numeros">
                  <td>{dataCurtaBr(d.data)}{d.tipo !== "normal" && <span className="text-texto-2"> {d.tipo}</span>}</td>
                  <td>{m.entrada ?? "—"}</td><td>{m.almoco ?? "—"}</td><td>{m.volta ?? "—"}</td><td>{m.saida ?? "—"}</td>
                  <td>{formatarDuracao(d.trabalhadoMin)}</td><td>{d.extraMin ? formatarDuracao(d.extraMin) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-1 text-legenda text-texto-2">
        {conta.ganhos.concat(conta.descontos).map((l) => <li key={l.codigo + l.descricao}>{l.conta}</li>)}
      </ul>
    </div>
  );
}

function CartaoPedido({ p, onMudou }: { p: Pedido; onMudou: () => void }) {
  const [ver, setVer] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // gravado como "whatsapp:11999998888" ou "email:ana@exemplo.com"
  const [tipo, ...resto] = (p.contato ?? (p.email ? `email:${p.email}` : "")).split(":");
  const valorContato = resto.join(":");
  const contato = !valorContato ? "sem contato" : tipo === "whatsapp" ? `WhatsApp ${valorContato}` : `E-mail ${valorContato}`;

  async function mudar(status: Status) {
    try {
      await pedirAdmin("/api/admin/suporte", { method: "POST", body: JSON.stringify({ id: p.id, status }) });
      onMudou();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não deu certo.");
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-cartao border border-borda bg-superficie p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-corpo font-bold">#{p.id} {p.email ?? "sem conta"}</h2>
        <span className="text-apoio text-texto-2" title={dataHora(p.criado_em)}>{haQuanto(p.criado_em)}</span>
      </div>
      <p className="whitespace-pre-wrap text-corpo">{p.mensagem}</p>
      <p className="text-apoio text-texto-2"><b className="text-texto">Técnico:</b> {linhaTecnica(p.tecnico)}</p>
      {Array.isArray(p.tecnico.ultimosErros) && p.tecnico.ultimosErros.length > 0 && (
        <ul className="rounded-pequeno bg-superficie-2 p-2 font-mono text-legenda">{(p.tecnico.ultimosErros as string[]).map((e, i) => <li key={i}>{e}</li>)}</ul>
      )}
      {p.registros ? (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setVer((v) => !v)} aria-expanded={ver} className="inline-flex min-h-10 items-center gap-2 self-start rounded-full bg-primaria-suave px-4 text-apoio font-bold text-primaria-forte">
            <Paperclip aria-hidden className="size-4" />
            {ver ? "Esconder" : "Ver"} registros de {dataCurtaBr(p.registros.periodo.inicio)} a {dataCurtaBr(p.registros.periodo.fim)}
          </button>
          <span className="text-legenda text-texto-2">Autorizados pela pessoa. Apagados em {dataCurtaBr(p.registros_expira?.slice(0, 10))}.</span>
          {ver && <VerRegistros r={p.registros} />}
        </div>
      ) : (
        <p className="text-legenda text-texto-2">Sem registros anexados{p.registros_expira === null ? "" : " (já foram apagados)"}.</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-borda pt-3">
        <span className="text-apoio">{contato}</span>
        {valorContato && (
          <button type="button" onClick={() => void navigator.clipboard?.writeText(valorContato).then(() => setMsg("Contato copiado."))} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-borda px-3 text-apoio font-bold">
            <Copy aria-hidden className="size-4" /> copiar
          </button>
        )}
        <span className="flex-1" />
        {p.status !== "respondido" && <button type="button" onClick={() => mudar("respondido")} className="min-h-10 rounded-full bg-primaria px-4 text-apoio font-bold text-sobre-primaria">Marcar como respondido</button>}
        {p.status !== "fechado" && <button type="button" onClick={() => mudar("fechado")} className="min-h-10 rounded-full border border-borda-forte px-4 text-apoio font-bold">Fechar</button>}
        {p.status !== "aberto" && <button type="button" onClick={() => mudar("aberto")} className="min-h-10 rounded-full border border-borda px-4 text-apoio font-bold">Reabrir</button>}
      </div>
      {msg && <p role="status" className="text-apoio font-bold">{msg}</p>}
    </li>
  );
}

export default function Suporte() {
  const [status, setStatus] = useState<Status>("aberto");
  const { dados, erro, carregando, recarregar } = useAdmin<{ pedidos: Pedido[] }>(`/api/admin/suporte?status=${status}`);
  return (
    <>
      <Cabecalho
        titulo="Suporte"
        descricao="Pedidos feitos em Conta, Falar com o suporte. A pessoa escolhe o que manda: por padrão só as informações técnicas; os registros só com autorização e somem em 30 dias."
        acao={<Recarregar onClick={recarregar} carregando={carregando} />}
      />
      <Abas<Status> valor={status} onChange={setStatus} opcoes={[{ id: "aberto", rotulo: "Abertos" }, { id: "respondido", rotulo: "Respondidos" }, { id: "fechado", rotulo: "Fechados" }]} />
      <Estado erro={erro} carregando={carregando && !dados} vazio={!!dados && !dados.pedidos.length} textoVazio="Nenhum pedido aqui." />
      {!!dados?.pedidos.length && (
        <ul className="flex flex-col gap-3">
          {dados.pedidos.map((p) => <CartaoPedido key={p.id} p={p} onMudou={recarregar} />)}
        </ul>
      )}
    </>
  );
}
