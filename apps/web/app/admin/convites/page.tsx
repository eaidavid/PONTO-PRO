"use client";

import { Copy, Plus } from "lucide-react";
import { useState } from "react";
import { dataCurtaBr, pedirAdmin, useAdmin } from "../../../lib/admin-cliente";
import { codigoDoNome } from "../../../lib/beta";
import { SITE_URL } from "../../../lib/site";
import { Cabecalho, Estado, Numero, Recarregar, Tabela } from "../comum";

interface Convite { codigo: string; nome: string; dias: number; limite: number | null; usados: number; ativo: boolean; criado_em: string }

const linkDe = (codigo: string) => `${SITE_URL}/beta/${codigo}`;
const mensagem = (codigo: string, dias: number) =>
  `Oi! Estou testando o Pingou, um app para bater o ponto no celular e ver quanto vai receber (hora extra, feriado, produção). Você ganha ${dias} dias do plano Pro de graça para testar comigo: ${linkDe(codigo)}`;

export default function Convites() {
  const { dados, erro, carregando, recarregar } = useAdmin<{ convites: Convite[] }>("/api/admin/convites");
  const [nome, setNome] = useState("");
  const [dias, setDias] = useState(90);
  const [limite, setLimite] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const convites = dados?.convites ?? [];
  const usados = convites.reduce((t, c) => t + c.usados, 0);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setMsg(null);
    try {
      const r = await pedirAdmin<{ codigo: string }>("/api/admin/convites", { method: "POST", body: JSON.stringify({ acao: "criar", nome, dias, ...(Number(limite) > 0 ? { limite: Number(limite) } : {}) }) });
      setMsg(`Convite criado: ${linkDe(r.codigo)}`);
      setNome("");
      setLimite("");
      recarregar();
    } catch (er) {
      setMsg(er instanceof Error ? er.message : "Não deu certo.");
    } finally {
      setOcupado(false);
    }
  }

  async function alternar(c: Convite) {
    await pedirAdmin("/api/admin/convites", { method: "POST", body: JSON.stringify({ acao: "ativo", codigo: c.codigo, ativo: !c.ativo }) }).catch(() => {});
    recarregar();
  }

  async function copiar(texto: string, aviso: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setMsg(aviso);
    } catch {
      setMsg(texto);
    }
  }

  const campo = "min-h-11 rounded-pequeno border border-borda-forte bg-superficie px-3 text-apoio";
  return (
    <>
      <Cabecalho titulo="Convites do beta" descricao="Cada convite é um link. Quem cria a conta por ele ganha Pro de cortesia pelos dias do convite, uma vez por pessoa." acao={<Recarregar onClick={recarregar} carregando={carregando} />} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:max-w-[560px]">
        <Numero rotulo="Convites" valor={convites.length} apoio={`${convites.filter((c) => c.ativo).length} ligados`} />
        <Numero rotulo="Pessoas que entraram" valor={usados} apoio="contas que ganharam o Pro" />
      </div>
      <form onSubmit={criar} className="mb-5 flex flex-wrap items-end gap-3 rounded-cartao border border-borda bg-superficie p-4">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-apoio font-bold">
          Nome do convite
          <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Obra da Vila Mariana" maxLength={80} required />
          {nome && <span className="text-legenda font-normal text-texto-2">Link: /beta/{codigoDoNome(nome) || "…"}</span>}
        </label>
        <label className="flex flex-col gap-1 text-apoio font-bold">
          Dias de Pro
          <select className={campo} value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} dias</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-apoio font-bold">
          Vagas (opcional)
          <input className={`${campo} w-28`} value={limite} onChange={(e) => setLimite(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="sem limite" />
        </label>
        <button type="submit" disabled={ocupado || !nome.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primaria px-4 text-apoio font-bold text-sobre-primaria disabled:opacity-50">
          <Plus aria-hidden className="size-4" /> Criar convite
        </button>
      </form>
      {msg && <p role="status" className="mb-4 break-all rounded-cartao bg-primaria-suave p-3 text-apoio font-bold">{msg}</p>}
      <Estado erro={erro} carregando={carregando && !dados} vazio={!!dados && !convites.length} textoVazio="Nenhum convite ainda. Crie o primeiro acima." />
      {!!convites.length && (
        <Tabela cabecalho={["Convite", "Link", "Dias", "Usados", "Situação", "Criado", ""]}>
          {convites.map((c) => (
            <tr key={c.codigo}>
              <td className="font-bold">{c.nome}</td>
              <td className="numeros text-legenda">/beta/{c.codigo}</td>
              <td className="numeros">{c.dias}</td>
              <td className="numeros">{c.usados}{c.limite ? ` de ${c.limite}` : ""}</td>
              <td>
                <button type="button" onClick={() => alternar(c)} className={`min-h-9 rounded-full px-3 text-legenda font-bold ${c.ativo ? "bg-primaria-suave text-primaria-forte" : "bg-superficie-2 text-texto-2"}`}>
                  {c.ativo ? "ligado" : "desligado"}
                </button>
              </td>
              <td className="numeros">{dataCurtaBr(c.criado_em.slice(0, 10))}</td>
              <td>
                <span className="flex gap-1">
                  <button type="button" onClick={() => copiar(linkDe(c.codigo), "Link copiado.")} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-borda px-3 text-legenda font-bold"><Copy aria-hidden className="size-3.5" /> link</button>
                  <button type="button" onClick={() => copiar(mensagem(c.codigo, c.dias), "Mensagem copiada. Cole no WhatsApp.")} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-borda px-3 text-legenda font-bold"><Copy aria-hidden className="size-3.5" /> mensagem</button>
                </span>
              </td>
            </tr>
          ))}
        </Tabela>
      )}
    </>
  );
}
