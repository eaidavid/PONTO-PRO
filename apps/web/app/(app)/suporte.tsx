"use client";

import { periodoDaData } from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, CampoTexto, LinhaAjuste, useToast } from "@ponto-pro/ui";
import { LifeBuoy, Send } from "lucide-react";
import { useId, useState } from "react";
import { type Estado, useAgora } from "../../lib/estado";
import { ultimosErros } from "../../lib/erros";
import { useStatusNuvem } from "../../lib/nuvem/status";
import { situacaoAtual } from "../../lib/plano";

/** Informações técnicas: o que ajuda a resolver sem ver o ponto da pessoa. */
function tecnico(estado: Estado, nuvem: ReturnType<typeof useStatusNuvem>) {
  const s = situacaoAtual(estado);
  const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    versao: (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    aparelho: navigator.userAgent.slice(0, 300),
    instalado,
    endereco: location.host,
    plano: s.emTeste ? `Pro em teste (${s.diasDeTeste} dias)` : s.plano,
    aviso: s.aviso ?? null,
    conta: nuvem.usuario ? "com conta" : "sem conta",
    sincronizacao: { fase: nuvem.fase, ultimaEm: nuvem.ultimaEm ?? null, pendentes: estado.pendentes },
    notificacoes: "Notification" in window ? Notification.permission : "sem suporte",
    aparencia: `${estado.preferencias.tamanho}, ${estado.preferencias.tema}`,
    perfil: estado.perfil ? { area: estado.perfil.area, forma: estado.perfil.pagamento.forma, fechamento: estado.perfil.ciclo.diaFechamento } : null,
    registrosNoAparelho: estado.registros.length,
    ultimosErros: [...ultimosErros],
  };
}

/** Linha "Falar com o suporte" da tela Conta, com o formulário. A pessoa escolhe o que manda. */
export function LinhaSuporte({ estado }: { estado: Estado }) {
  const nuvem = useStatusNuvem();
  const agora = useAgora();
  const { mostrar } = useToast();
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [contato, setContato] = useState("");
  const [mandarTecnico, setMandarTecnico] = useState(true);
  const [mandarRegistros, setMandarRegistros] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const comConta = !!nuvem.usuario?.email;

  async function enviar() {
    setErro(null);
    if (mensagem.trim().length < 3) return setErro("Conte o que aconteceu.");
    const digitos = contato.replace(/\D/g, "");
    const ehEmail = contato.includes("@");
    if (!comConta && !ehEmail && digitos.length < 10) return setErro("Deixe um e-mail ou WhatsApp com DDD para a resposta.");
    setEnviando(true);
    try {
      let token = "";
      if (nuvem.usuario) {
        const { supabase } = await import("../../lib/nuvem/supabase");
        token = (await supabase().auth.getSession()).data.session?.access_token ?? "";
      }
      const periodo = estado.perfil && agora ? periodoDaData(agora.data, estado.perfil.ciclo.diaFechamento) : null;
      const corpo = {
        mensagem: mensagem.trim(),
        ...(ehEmail ? { email: contato.trim() } : digitos.length >= 10 ? { whatsapp: digitos } : {}),
        tecnico: mandarTecnico ? tecnico(estado, nuvem) : {},
        ...(mandarRegistros && periodo
          ? {
              registros: {
                periodo,
                perfil: estado.perfil,
                registros: estado.registros.filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim),
                lancamentos: estado.lancamentos.filter((l) => l.data >= periodo.inicio && l.data <= periodo.fim),
                itens: estado.itens.filter((i) => estado.lancamentos.some((l) => l.itemId === i.id && l.data >= periodo.inicio && l.data <= periodo.fim)),
              },
            }
          : {}),
      };
      const r = await fetch("/api/suporte", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(corpo) });
      const resp = (await r.json().catch(() => ({}))) as { erro?: string; protocolo?: number };
      if (!r.ok) throw new Error(resp.erro ?? "Não deu para mandar agora.");
      setAberto(false);
      setMensagem("");
      setMandarRegistros(false);
      mostrar({ texto: `Pedido enviado. Protocolo ${resp.protocolo}. Respondemos em até 1 dia útil.` });
    } catch (e) {
      setErro(navigator.onLine ? (e instanceof Error ? e.message : "Não deu para mandar agora.") : "Sem internet agora. Conecte e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const caixa = "flex items-start gap-3 rounded-cartao bg-superficie-2 p-3 text-apoio";
  return (
    <>
      <LinhaAjuste icone={LifeBuoy} rotulo="Falar com o suporte" valor="Dúvida, erro ou conta que não bateu" onClick={() => setAberto(true)} />
      <BottomSheet
        aberto={aberto}
        onFechar={() => setAberto(false)}
        titulo="Falar com o suporte"
        subtitulo="Você escolhe o que manda junto."
        rodape={
          <BotaoPrincipal tamanho="g" icone={Send} disabled={enviando} onClick={enviar}>
            {enviando ? "Enviando…" : "Enviar pedido"}
          </BotaoPrincipal>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-msg`} className="text-corpo font-bold">O que aconteceu?</label>
            <textarea
              id={`${id}-msg`}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Ex.: a hora extra de sábado não entrou na conta"
              className="rounded-cartao border-2 border-borda-forte bg-superficie p-3 text-corpo outline-none focus:border-primaria"
            />
          </div>
          <CampoTexto
            rotulo={comConta ? `Responder em outro contato? (opcional, senão ${nuvem.usuario?.email})` : "E-mail ou WhatsApp para a resposta"}
            valor={contato}
            onChange={setContato}
            autoComplete="email"
          />
          <label className={caixa}>
            <input type="checkbox" checked={mandarTecnico} onChange={(e) => setMandarTecnico(e.target.checked)} className="mt-0.5 size-5 accent-[color:var(--primaria)]" />
            <span>
              <b className="block text-corpo">Mandar informações técnicas</b>
              Versão do app, aparelho, plano, sincronização e últimos erros. Não inclui seus horários nem valores.
            </span>
          </label>
          <label className={caixa}>
            <input type="checkbox" checked={mandarRegistros} onChange={(e) => setMandarRegistros(e.target.checked)} className="mt-0.5 size-5 accent-[color:var(--primaria)]" />
            <span>
              <b className="block text-corpo">Mandar meus registros deste período</b>
              Só se você quiser que o suporte confira a conta. Vão os horários, a produção e as regras do seu perfil. Ficam guardados 30 dias e depois são apagados.
            </span>
          </label>
          {erro && <p role="alert" className="text-apoio font-bold text-erro-texto">{erro}</p>}
        </div>
      </BottomSheet>
    </>
  );
}
