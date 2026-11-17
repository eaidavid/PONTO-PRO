"use client";

import { cx } from "@ponto-pro/ui";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { dataCurtaBr, dataHora, haQuanto, pedirAdmin, useAdmin } from "../../../lib/admin-cliente";
import { Abas, Cabecalho, Estado, Recarregar, situacao, Tabela } from "../comum";

interface Pessoa {
  id: string;
  email: string;
  criada: string;
  ultimo_uso: string | null;
  inicio_uso: string | null;
  plano: string | null;
  status: string | null;
  ciclo: string | null;
  pago_ate: string | null;
  provedor: string | null;
  avisos: number;
}
interface Detalhe {
  id: string;
  email: string;
  criada: string;
  ultimoUso: string | null;
  diasRegistrados: number;
  lancamentos: number;
  area: string | null;
  forma: string | null;
  avisos: number;
  inicioUso: string | null;
  assinatura: { plano: string; status: string; ciclo: string; pago_ate: string; provedor: string; provedor_assinatura: string | null } | null;
  acoes: { em: string; acao: string; admin: string; detalhes: Record<string, unknown> }[];
}
type Filtro = "todas" | "ativas" | "teste" | "pro" | "paradas";

function PainelPessoa({ id, onFechar, onMudou }: { id: string; onFechar: () => void; onMudou: () => void }) {
  const { dados: d, erro, carregando, recarregar } = useAdmin<Detalhe>(`/api/admin/pessoa?id=${id}`);
  const [dias, setDias] = useState(30);
  const [confirmacao, setConfirmacao] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function agir(corpo: Record<string, unknown>, sucesso: string) {
    setOcupado(true);
    setMsg(null);
    try {
      await pedirAdmin("/api/admin/pessoa", { method: "POST", body: JSON.stringify({ id, ...corpo }) });
      setMsg(sucesso);
      onMudou();
      if (corpo.acao === "apagar") onFechar();
      else void recarregar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não deu certo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <aside aria-label="Detalhe da pessoa" className="flex flex-col gap-4 rounded-cartao border border-borda bg-superficie p-4 lg:sticky lg:top-6">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 truncate text-destaque font-bold">{d?.email ?? "Pessoa"}</h2>
        <button type="button" aria-label="Fechar" onClick={onFechar} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-superficie-2"><X aria-hidden className="size-5" /></button>
      </div>
      <Estado erro={erro} carregando={carregando && !d} />
      {d && (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-apoio">
            <dt className="text-texto-2">Criada</dt><dd>{dataHora(d.criada)}</dd>
            <dt className="text-texto-2">Último uso</dt><dd>{haQuanto(d.ultimoUso)}</dd>
            <dt className="text-texto-2">Situação</dt><dd className="font-bold">{situacao({ ...(d.assinatura ?? { status: null, ciclo: null, pago_ate: null, provedor: null }), inicioUso: d.inicioUso })}</dd>
            <dt className="text-texto-2">Dias registrados</dt><dd className="numeros">{d.diasRegistrados}</dd>
            <dt className="text-texto-2">Produção lançada</dt><dd className="numeros">{d.lancamentos}</dd>
            <dt className="text-texto-2">Área e forma</dt><dd>{[d.area, d.forma].filter(Boolean).join(", ") || "—"}</dd>
            <dt className="text-texto-2">Aparelhos com aviso</dt><dd className="numeros">{d.avisos}</dd>
          </dl>
          <p className="rounded-pequeno bg-superficie-2 p-3 text-legenda text-texto-2">O painel mostra só contagens. Horários e valores da pessoa ficam com ela.</p>

          <section className="flex flex-col gap-2">
            <h3 className="text-apoio font-bold">Pro de cortesia</h3>
            {d.assinatura?.provedor === "cortesia" ? (
              <button type="button" disabled={ocupado} onClick={() => agir({ acao: "tirar-cortesia" }, "Cortesia retirada.")} className="min-h-11 rounded-full border border-borda-forte px-4 text-apoio font-bold">Tirar a cortesia</button>
            ) : d.assinatura && d.assinatura.provedor !== "cortesia" && d.assinatura.status !== "cancelada" ? (
              <p className="text-apoio text-texto-2">Já tem assinatura paga.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="dias-cortesia">Dias de cortesia</label>
                <select id="dias-cortesia" value={dias} onChange={(e) => setDias(Number(e.target.value))} className="min-h-11 rounded-full border border-borda-forte bg-superficie px-3 text-apoio">
                  {[7, 30, 90, 365].map((n) => <option key={n} value={n}>{n} dias</option>)}
                </select>
                <button type="button" disabled={ocupado} onClick={() => agir({ acao: "cortesia", dias }, `Pro liberado por ${dias} dias.`)} className="min-h-11 rounded-full bg-primaria px-4 text-apoio font-bold text-sobre-primaria">Dar Pro de cortesia</button>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2 border-t border-borda pt-3">
            <h3 className="text-apoio font-bold text-erro-texto">Apagar conta e dados (LGPD)</h3>
            <label htmlFor="confirma-apagar" className="text-legenda text-texto-2">Digite o e-mail da pessoa para confirmar. Não dá para desfazer.</label>
            <input id="confirma-apagar" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="min-h-11 rounded-pequeno border border-borda-forte bg-superficie px-3 text-apoio" autoComplete="off" />
            <button type="button" disabled={ocupado || confirmacao.trim().toLowerCase() !== d.email.toLowerCase()} onClick={() => agir({ acao: "apagar", confirmacao }, "Conta apagada.")} className="min-h-11 rounded-full bg-erro-suave px-4 text-apoio font-bold text-erro-texto disabled:opacity-50">Apagar tudo</button>
          </section>

          {msg && <p role="status" className="text-apoio font-bold">{msg}</p>}

          {d.acoes.length > 0 && (
            <section className="flex flex-col gap-1 border-t border-borda pt-3">
              <h3 className="text-apoio font-bold">Histórico de ações</h3>
              <ul className="flex flex-col gap-1 text-legenda text-texto-2">
                {d.acoes.map((a) => <li key={a.em + a.acao}>{dataHora(a.em)}: {a.admin} fez “{a.acao}”{a.detalhes.dias ? ` (${String(a.detalhes.dias)} dias)` : ""}</li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </aside>
  );
}

export default function Pessoas() {
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [pagina, setPagina] = useState(0);
  const [aberta, setAberta] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setBusca(texto.trim());
      setPagina(0);
    }, 350);
    return () => clearTimeout(t);
  }, [texto]);
  const url = `/api/admin/pessoas?busca=${encodeURIComponent(busca)}&filtro=${filtro}&pagina=${pagina}`;
  const { dados, erro, carregando, recarregar } = useAdmin<{ pessoas: Pessoa[]; total: number }>(url);
  const total = Number(dados?.total ?? 0);

  return (
    <>
      <Cabecalho titulo="Pessoas" descricao="Contas criadas. Busque pelo e-mail para ver a situação, dar cortesia ou apagar a pedido." acao={<Recarregar onClick={recarregar} carregando={carregando} />} />
      <div className="mb-3 flex max-w-[420px] items-center gap-2 rounded-full border border-borda-forte bg-superficie px-4">
        <Search aria-hidden className="size-4 text-texto-2" />
        <label htmlFor="busca-pessoa" className="sr-only">Buscar por e-mail</label>
        <input id="busca-pessoa" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por e-mail" className="min-h-11 flex-1 bg-transparent text-apoio outline-none" />
      </div>
      <Abas<Filtro>
        valor={filtro}
        onChange={(f) => { setFiltro(f); setPagina(0); }}
        opcoes={[
          { id: "todas", rotulo: "Todas" },
          { id: "ativas", rotulo: "Ativas em 7 dias" },
          { id: "teste", rotulo: "Em teste" },
          { id: "pro", rotulo: "Pro" },
          { id: "paradas", rotulo: "Sem uso há 30 dias" },
        ]}
      />
      <div className={cx("grid gap-4", aberta && "lg:grid-cols-[1fr_360px]")}>
        <div className="min-w-0">
          <Estado erro={erro} carregando={carregando && !dados} vazio={!!dados && !dados.pessoas.length} textoVazio="Ninguém encontrado." />
          {!!dados?.pessoas.length && (
            <>
              <Tabela cabecalho={["E-mail", "Criada", "Último uso", "Situação", "Avisos"]}>
                {dados.pessoas.map((p) => (
                  <tr key={p.id} className={cx("cursor-pointer hover:bg-superficie-2", aberta === p.id && "bg-primaria-suave")} onClick={() => setAberta(p.id)}>
                    <td><button type="button" className="text-left font-bold underline-offset-2 hover:underline" onClick={() => setAberta(p.id)}>{p.email}</button></td>
                    <td className="numeros">{dataCurtaBr(p.criada.slice(0, 10))}</td>
                    <td>{haQuanto(p.ultimo_uso)}</td>
                    <td>{situacao(p)}</td>
                    <td className="numeros">{p.avisos ? "ligado" : "—"}</td>
                  </tr>
                ))}
              </Tabela>
              <div className="mt-3 flex items-center justify-between text-apoio text-texto-2">
                <span className="numeros">{total} {total === 1 ? "pessoa" : "pessoas"}</span>
                <span className="flex gap-2">
                  <button type="button" disabled={pagina === 0} onClick={() => setPagina((n) => n - 1)} className="min-h-10 rounded-full border border-borda px-4 font-bold disabled:opacity-40">Anteriores</button>
                  <button type="button" disabled={(pagina + 1) * 50 >= total} onClick={() => setPagina((n) => n + 1)} className="min-h-10 rounded-full border border-borda px-4 font-bold disabled:opacity-40">Próximas</button>
                </span>
              </div>
            </>
          )}
        </div>
        {aberta && <PainelPessoa key={aberta} id={aberta} onFechar={() => setAberta(null)} onMudou={recarregar} />}
      </div>
    </>
  );
}
