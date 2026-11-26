"use client";

import { diasEntre, MODELOS } from "@ponto-pro/core";
import { BotaoPrincipal, cx, useToast } from "@ponto-pro/ui";
import { MessageCircleHeart, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { Estado } from "../../lib/estado";
import { gravarLocal, lerLocal, medir } from "../../lib/medir";

const CHAVE = "pp-opiniao";
const DIAS_PARA_PEDIR = 7;

/**
 * Opinião do beta, depois de 7 dias de uso: nota de 0 a 10 ("indicaria a um colega?"), o que melhoraria e,
 * só se a pessoa quiser, autorização para publicar o que escreveu na página de vendas.
 * "Agora não" pergunta de novo em 7 dias; respondido, não pergunta mais.
 */
export function PedirOpiniao({ estado, hoje }: { estado: Estado; hoje: string }) {
  const id = useId();
  const { mostrar } = useToast();
  const [visivel, setVisivel] = useState(false);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [nome, setNome] = useState(estado.pessoal.nome?.split(" ")[0] ?? "");
  const [funcao, setFuncao] = useState(estado.equipe?.minhaFuncao ?? estado.pessoal.cargo ?? (estado.perfil ? MODELOS[estado.perfil.area]?.nome : "") ?? "");
  const [cidade, setCidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const salvo = lerLocal(CHAVE);
    const usou = estado.inicioUso ? diasEntre(estado.inicioUso, hoje) : 0;
    if (salvo === "respondida" || usou < DIAS_PARA_PEDIR) return;
    if (salvo && /^\d{4}-\d{2}-\d{2}$/.test(salvo) && salvo > hoje) return;
    setVisivel(true);
  }, [estado.inicioUso, hoje]);

  if (!visivel) return null;

  function adiar() {
    const d = new Date(`${hoje}T12:00:00`);
    d.setDate(d.getDate() + 7);
    gravarLocal(CHAVE, d.toISOString().slice(0, 10));
    setVisivel(false);
  }

  async function enviar() {
    if (nota === null) return;
    setEnviando(true);
    setErro(null);
    try {
      let token = "";
      try {
        const { supabase } = await import("../../lib/nuvem/supabase");
        token = (await supabase().auth.getSession()).data.session?.access_token ?? "";
      } catch {
        /* sem conta configurada */
      }
      const r = await fetch("/api/opiniao", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          nota,
          ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
          autoriza: autoriza && !!comentario.trim() && !!nome.trim(),
          ...(nome.trim() ? { nome: nome.trim() } : {}),
          ...(funcao.trim() ? { funcao: funcao.trim() } : {}),
          ...(cidade.trim() ? { cidade: cidade.trim() } : {}),
        }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) throw new Error(corpo.erro ?? "Não deu para mandar agora.");
      medir("opiniao", { nota, autoriza: autoriza ? 1 : 0 });
      gravarLocal(CHAVE, "respondida");
      setVisivel(false);
      mostrar({ texto: "Obrigado! Sua opinião ajuda a melhorar o Pingou." });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para mandar agora.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = "min-h-12 w-full rounded-pequeno border-2 border-borda-forte bg-superficie px-3 text-corpo outline-none focus:border-primaria";
  return (
    <section aria-labelledby={`${id}-t`} className="cartao flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <MessageCircleHeart aria-hidden className="mt-0.5 size-6 shrink-0 text-primaria" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={`${id}-t`} className="text-corpo font-bold">Você já usa o Pingou há uma semana. Como está sendo?</h2>
          <p className="text-apoio text-texto-2">De 0 a 10, quanto você indicaria o Pingou a um colega?</p>
        </div>
        <button type="button" onClick={adiar} aria-label="Agora não" className="-mt-1 -mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-texto-2 active:bg-superficie-2">
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div role="radiogroup" aria-label="Nota de 0 a 10" className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            onClick={() => setNota(n)}
            className={cx("numeros min-h-11 rounded-pequeno border-2 text-corpo font-bold", nota === n ? "border-primaria bg-primaria text-sobre-primaria" : "border-borda-forte bg-superficie")}
          >
            {n}
          </button>
        ))}
      </div>
      {nota !== null && (
        <>
          <label htmlFor={`${id}-c`} className="flex flex-col gap-1.5 text-corpo font-bold">
            {nota >= 9 ? "O que você mais gosta?" : "O que faria você usar mais?"}
            <textarea id={`${id}-c`} value={comentario} onChange={(e) => setComentario(e.target.value.slice(0, 1000))} rows={3} className="min-h-24 rounded-cartao border-2 border-borda-forte bg-superficie p-3 text-corpo font-normal outline-none focus:border-primaria" />
          </label>
          {comentario.trim().length > 0 && (
            <div className="flex flex-col gap-3 rounded-cartao bg-superficie-2 p-3">
              <label className="flex items-start gap-3 text-apoio">
                <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[color:var(--primaria)]" />
                <span>
                  <b className="block text-corpo">Pode publicar o que escrevi na página do Pingou</b>
                  Com o primeiro nome e a função abaixo. Você pode pedir para tirar quando quiser, pelo suporte.
                </span>
              </label>
              {autoriza && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-apoio font-bold">Primeiro nome<input className={campo} value={nome} onChange={(e) => setNome(e.target.value.slice(0, 40))} autoComplete="given-name" /></label>
                  <label className="flex flex-col gap-1 text-apoio font-bold">Função<input className={campo} value={funcao} onChange={(e) => setFuncao(e.target.value.slice(0, 40))} placeholder="Pedreiro" /></label>
                  <label className="flex flex-col gap-1 text-apoio font-bold">Cidade (opcional)<input className={campo} value={cidade} onChange={(e) => setCidade(e.target.value.slice(0, 60))} placeholder="Campinas/SP" /></label>
                </div>
              )}
            </div>
          )}
          {erro && <p role="alert" className="text-apoio font-bold text-erro-texto">{erro}</p>}
          <BotaoPrincipal onClick={enviar} disabled={enviando || (autoriza && !nome.trim())}>{enviando ? "Enviando…" : "Mandar opinião"}</BotaoPrincipal>
        </>
      )}
    </section>
  );
}
