"use client";

import { cx } from "@ponto-pro/ui";
import { CircleCheck } from "lucide-react";
import { useId, useState } from "react";
import { medir } from "../lib/medir";

/**
 * Lista de espera da Turma: nome, WhatsApp e tamanho da equipe.
 * `sobreMarca` para usar em fundo verde (página de vendas e cartão do plano).
 */
export function ListaEsperaTurma({ origem, sobreMarca }: { origem: "app" | "site"; sobreMarca?: boolean }) {
  const id = useId();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pessoas, setPessoas] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "ok">("parado");
  const [erro, setErro] = useState<string | null>(null);

  const numeros = whatsapp.replace(/\D/g, "");
  const valido = nome.trim().length >= 2 && numeros.length >= 10 && numeros.length <= 13;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) {
      setErro("Confira o nome e o WhatsApp com DDD.");
      return;
    }
    setErro(null);
    setEstado("enviando");
    medir("lista_espera", { plano: "turma", origem });
    try {
      const r = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: "equipe", nome: nome.trim(), whatsapp: numeros, origem, ...(Number(pessoas) > 0 ? { pessoas: Number(pessoas) } : {}) }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) throw new Error(corpo.erro ?? "Não deu para salvar agora.");
      setEstado("ok");
    } catch (e) {
      setErro(navigator.onLine ? (e instanceof Error ? e.message : "Não deu para salvar agora.") : "Sem internet agora. Conecte e tente de novo.");
      setEstado("parado");
    }
  }

  if (estado === "ok") {
    return (
      <p role="status" className={cx("flex items-start gap-2 rounded-2xl p-4 text-17 font-bold", sobreMarca ? "bg-white/12" : "bg-sucesso-suave")}>
        <CircleCheck aria-hidden className={cx("mt-0.5 size-5 shrink-0", sobreMarca ? "text-marca-destaque" : "text-sucesso-texto")} />
        Pronto. Avisamos no seu WhatsApp quando a Turma abrir.
      </p>
    );
  }

  const campo = cx(
    "min-h-12 w-full rounded-xl border px-3 text-17 outline-none focus-visible:ring-2",
    sobreMarca ? "border-white/30 bg-white/10 text-sobre-marca placeholder:text-white/60 focus-visible:ring-marca-destaque" : "border-borda-forte bg-superficie text-texto focus-visible:ring-primaria",
  );
  const rotulo = "flex flex-col gap-1 text-15 font-bold";

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem]">
        <label htmlFor={`${id}-nome`} className={rotulo}>
          Seu nome
          <input id={`${id}-nome`} className={campo} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" maxLength={80} />
        </label>
        <label htmlFor={`${id}-zap`} className={rotulo}>
          WhatsApp com DDD
          <input id={`${id}-zap`} className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="11 91234-5678" />
        </label>
        <label htmlFor={`${id}-pessoas`} className={rotulo}>
          Pessoas
          <input id={`${id}-pessoas`} className={campo} value={pessoas} onChange={(e) => setPessoas(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="5" />
        </label>
      </div>
      {erro && (
        <p role="alert" className={cx("text-15 font-bold", sobreMarca ? "text-sobre-marca" : "text-erro-texto")}>
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={estado === "enviando"}
        className={cx(
          "inline-flex min-h-12 items-center justify-center self-start rounded-full px-6 text-17 font-bold disabled:opacity-60",
          sobreMarca ? "bg-white text-[color:var(--marca)]" : "bg-primaria text-sobre-primaria",
        )}
      >
        {estado === "enviando" ? "Enviando…" : "Quero ser avisado"}
      </button>
      <p className={cx("text-13", sobreMarca ? "text-sobre-marca-2" : "text-texto-2")}>Usamos seu nome e WhatsApp só para avisar quando a Turma abrir.</p>
    </form>
  );
}
