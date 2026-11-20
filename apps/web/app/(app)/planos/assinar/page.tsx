"use client";

import { type CicloCobranca, economiaAnual, formatarReais, lerCpfCnpj, PLANOS, valorDoCiclo } from "@ponto-pro/core";
import { BotaoPrincipal, CabecalhoTela, CampoTexto, CartaoOpcao } from "@ponto-pro/ui";
import { CalendarCheck, CalendarDays, CreditCard, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useEstado } from "../../../../lib/estado";
import { sincronizarAgora, useStatusNuvem } from "../../../../lib/nuvem/status";
import { COBRANCA_ABERTA } from "../../../../lib/cobranca/aberta";
import { MARCA } from "../../../../lib/marca";
import { ListaEsperaTurma } from "../../../lista-espera-turma";
import { Carregando } from "../../../carregando";

/**
 * Assinar o Pro: mensal ou anual, nome e CPF/CNPJ; o pagamento (Pix ou cartão) abre na página segura do provedor.
 * Antes de a cobrança abrir (COBRANCA_ABERTA), a tela vira "Quero ser avisado", com a lista de espera do Pro.
 * A Turma ainda não está à venda: quem chega aqui com ?plano=equipe volta para Planos.
 */
function Assinar() {
  const estado = useEstado();
  const nuvem = useStatusNuvem();
  const busca = useSearchParams();
  const plano = "individual" as const;
  const [ciclo, setCiclo] = useState<CicloCobranca>(busca.get("ciclo") === "anual" ? "anual" : "mensal");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  if (!estado?.perfil) return <Carregando />;
  const p = PLANOS[plano];
  const valor = valorDoCiclo(plano, ciclo);
  const porMes = ciclo === "anual" ? Math.round(valor / 12) : valor;
  const docOk = !!lerCpfCnpj(documento);

  async function pagar() {
    setErro(null);
    if (!docOk) {
      setErro("Confira o CPF ou CNPJ.");
      return;
    }
    setEnviando(true);
    try {
      const { supabase } = await import("../../../../lib/nuvem/supabase");
      const { data } = await supabase().auth.getSession();
      const r = await fetch("/api/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ plano, ciclo, trabalhadores: 1, nome: nome.trim(), cpfCnpj: documento }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { link?: string; erro?: string };
      if (!r.ok || !corpo.link) throw new Error(corpo.erro ?? "Não deu para criar a cobrança agora.");
      setLink(corpo.link);
      // pode ser bloqueado pelo navegador: o link fica na tela também
      window.open(corpo.link, "_blank", "noopener");
    } catch (e) {
      setErro(navigator.onLine ? (e instanceof Error ? e.message : "Não deu certo agora.") : "Sem internet agora. Conecte e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex flex-col gap-5 px-4 pb-6">
      <CabecalhoTela titulo={`Assinar o ${p.nome}`} subtitulo={ciclo === "anual" ? `${formatarReais(valor)} por ano, ${formatarReais(porMes)} por mês` : `${formatarReais(valor)} por mês, cancele quando quiser`} />

      {!COBRANCA_ABERTA || !nuvem.configurado ? (
        <section aria-labelledby="t-em-breve" className="flex flex-col gap-4 rounded-grande bg-primaria-suave p-5">
          <div className="flex flex-col gap-1">
            <h2 id="t-em-breve" className="text-destaque font-bold">As assinaturas abrem em breve</h2>
            <p className="text-apoio text-texto-2">
              Enquanto isso, o Pro continua liberado no seu teste grátis. Deixe seu WhatsApp: avisamos quando abrir e, se o seu teste acabar antes, liberamos mais tempo de Pro para você.
            </p>
          </div>
          <ListaEsperaTurma origem="app" plano="individual" />
          <Link href="/planos" className="inline-flex min-h-12 items-center justify-center text-apoio font-bold text-primaria-forte underline underline-offset-4">Voltar para Planos</Link>
        </section>
      ) : !nuvem.usuario ? (
        <section className="cartao flex flex-col gap-3 p-5">
          <p className="text-corpo">Para assinar, entre na sua conta. Assim o plano vale em qualquer celular e seus dados ficam guardados.</p>
          <Link href="/entrar" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primaria px-6 text-corpo font-bold text-sobre-primaria">
            <LogIn aria-hidden className="size-5" /> Entrar ou criar conta
          </Link>
        </section>
      ) : link ? (
        <section className="cartao flex flex-col gap-3 p-5">
          <p className="text-corpo">Pague com Pix ou cartão na página segura de pagamento.</p>
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primaria px-6 text-corpo font-bold text-sobre-primaria">
            <CreditCard aria-hidden className="size-5" /> Abrir a página de pagamento
          </a>
          <p className="text-apoio text-texto-2">Assim que o pagamento for confirmado, o plano muda sozinho (com Pix, em poucos minutos).</p>
          <BotaoPrincipal icone={RefreshCw} onClick={() => sincronizarAgora()}>Já paguei, atualizar</BotaoPrincipal>
          <Link href="/planos" className="inline-flex min-h-12 items-center justify-center text-apoio font-bold text-primaria-forte underline underline-offset-4">Voltar para Planos</Link>
        </section>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            pagar();
          }}
        >
          <div role="radiogroup" aria-label="Como quer pagar" className="flex flex-col gap-2">
            <CartaoOpcao
              icone={CalendarCheck}
              titulo={`Por ano: ${formatarReais(p.precoAnual ?? 0)}`}
              descricao={`Sai por ${formatarReais(Math.round((p.precoAnual ?? 0) / 12))} por mês. Você economiza ${formatarReais(economiaAnual(plano))}.`}
              selecionado={ciclo === "anual"}
              onClick={() => setCiclo("anual")}
            />
            <CartaoOpcao
              icone={CalendarDays}
              titulo={`Por mês: ${formatarReais(p.preco)}`}
              descricao="Cobrado todo mês. Cancele quando quiser."
              selecionado={ciclo === "mensal"}
              onClick={() => setCiclo("mensal")}
            />
          </div>
          <CampoTexto rotulo="Nome completo (para a nota)" valor={nome} onChange={setNome} autoComplete="name" />
          <CampoTexto rotulo="CPF ou CNPJ" valor={documento} onChange={setDocumento} inputMode="numeric" ajuda="O provedor de pagamento exige para emitir a cobrança." />
          {erro && <p role="alert" className="text-apoio font-bold text-erro-texto">{erro}</p>}
          <BotaoPrincipal tamanho="g" icone={CreditCard} type="submit" disabled={enviando || nome.trim().length < 3 || !docOk}>
            {enviando ? "Abrindo…" : `Pagar ${formatarReais(valor)} com Pix ou cartão`}
          </BotaoPrincipal>
        </form>
      )}

      {COBRANCA_ABERTA && <p className="flex gap-2 px-1 text-legenda text-texto-2">
        <ShieldCheck aria-hidden className="size-4 shrink-0" />
        <span>
          O pagamento é feito por uma instituição de pagamento autorizada. O {MARCA.nome} não vê nem guarda dados do seu cartão. {ciclo === "anual" ? "Cobrança anual" : "Cobrança mensal"}; cancele quando quiser em Planos. Desistiu nos primeiros 7 dias? O valor volta para você.
        </span>
      </p>}
    </main>
  );
}

export default function PaginaAssinar() {
  return (
    <Suspense fallback={<Carregando />}>
      <Assinar />
    </Suspense>
  );
}
