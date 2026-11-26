"use client";

import { cx } from "@ponto-pro/ui";
import { useState } from "react";
import { haQuanto, pedirAdmin, useAdmin } from "../../../lib/admin-cliente";
import { Abas, Cabecalho, Estado, Numero, Recarregar } from "../comum";

type Status = "novo" | "aprovado" | "oculto";
interface Opiniao { id: number; nota: number | null; comentario: string | null; autoriza: boolean; nome: string | null; funcao: string | null; cidade: string | null; status: Status; criado_em: string }

const corNota = (n: number | null) => (n === null ? "bg-superficie-2" : n >= 9 ? "bg-primaria-suave text-primaria-forte" : n >= 7 ? "bg-superficie-2" : "bg-erro-suave text-erro-texto");

export default function Opinioes() {
  const [status, setStatus] = useState<Status>("novo");
  const { dados, erro, carregando, recarregar } = useAdmin<{ opinioes: Opiniao[]; nps: number | null; respostas: number }>(`/api/admin/opinioes?status=${status}`);
  const [msg, setMsg] = useState<string | null>(null);

  async function mudar(o: Opiniao, novo: Status) {
    setMsg(null);
    try {
      await pedirAdmin("/api/admin/opinioes", { method: "POST", body: JSON.stringify({ id: o.id, status: novo }) });
      setMsg(novo === "aprovado" ? "Publicado. A página de vendas mostra em até 1 hora." : novo === "oculto" ? "Escondido." : "Voltou para as novas.");
      recarregar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não deu certo.");
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Opiniões"
        descricao="O app pergunta depois de 7 dias de uso. Só dá para publicar na página de vendas o que a pessoa autorizou, com o nome dela."
        acao={<Recarregar onClick={recarregar} carregando={carregando} />}
      />
      {dados && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:max-w-[560px]">
          <Numero rotulo="Indicaria a um colega (NPS)" valor={dados.nps === null ? "—" : dados.nps} apoio="% de notas 9–10 menos % de 0–6; acima de 30 é bom" />
          <Numero rotulo="Respostas" valor={dados.respostas} />
        </div>
      )}
      <Abas<Status> valor={status} onChange={setStatus} opcoes={[{ id: "novo", rotulo: "Novas" }, { id: "aprovado", rotulo: "Publicadas" }, { id: "oculto", rotulo: "Escondidas" }]} />
      {msg && <p role="status" className="mb-3 text-apoio font-bold">{msg}</p>}
      <Estado erro={erro} carregando={carregando && !dados} vazio={!!dados && !dados.opinioes.length} textoVazio="Nenhuma opinião aqui." />
      <ul className="flex flex-col gap-3">
        {dados?.opinioes.map((o) => (
          <li key={o.id} className="flex flex-col gap-2 rounded-cartao border border-borda bg-superficie p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cx("numeros rounded-full px-3 py-0.5 text-apoio font-bold", corNota(o.nota))}>nota {o.nota ?? "—"}</span>
              <span className="text-apoio text-texto-2">{haQuanto(o.criado_em)}</span>
              {o.autoriza ? <span className="rounded-full bg-primaria-suave px-2.5 py-0.5 text-legenda font-bold text-primaria-forte">autorizou publicar</span> : <span className="text-legenda text-texto-2">não autorizou publicar</span>}
            </div>
            {o.comentario ? <p className="whitespace-pre-wrap text-corpo">“{o.comentario}”</p> : <p className="text-apoio text-texto-2">Sem comentário.</p>}
            {(o.nome || o.funcao) && <p className="text-apoio text-texto-2">{[o.nome, o.funcao, o.cidade].filter(Boolean).join(", ")}</p>}
            <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
              {o.status !== "aprovado" && o.autoriza && o.comentario && o.nome && (
                <button type="button" onClick={() => mudar(o, "aprovado")} className="min-h-10 rounded-full bg-primaria px-4 text-apoio font-bold text-sobre-primaria">Publicar na página</button>
              )}
              {o.status !== "oculto" && <button type="button" onClick={() => mudar(o, "oculto")} className="min-h-10 rounded-full border border-borda-forte px-4 text-apoio font-bold">Esconder</button>}
              {o.status !== "novo" && <button type="button" onClick={() => mudar(o, "novo")} className="min-h-10 rounded-full border border-borda px-4 text-apoio font-bold">Voltar para novas</button>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
