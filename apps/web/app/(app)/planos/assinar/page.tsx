"use client";

import { formatarReais, lerCpfCnpj, PLANOS, TRABALHADORES_MAX, TRABALHADORES_MIN, valorMensal } from "@ponto-pro/core";
import { Banner, BotaoPrincipal, CabecalhoTela, CampoTexto, Contador } from "@ponto-pro/ui";
import { CreditCard, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useEstado } from "../../../../lib/estado";
import { sincronizarAgora, useStatusNuvem } from "../../../../lib/nuvem/status";
import { MARCA } from "../../../../lib/marca";
import { Carregando } from "../../../carregando";

/** Assinar: nome e CPF/CNPJ, e o pagamento (Pix ou cartão) abre na página segura do Asaas. */
function Assinar() {
  const estado = useEstado();
  const nuvem = useStatusNuvem();
  const busca = useSearchParams();
  const plano = busca.get("plano") === "equipe" ? "equipe" : "individual";
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [trabalhadores, setTrabalhadores] = useState(5);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  if (!estado?.perfil) return <Carregando />;
  const p = PLANOS[plano];
  const qtd = plano === "equipe" ? trabalhadores : 1;
  const valor = valorMensal(plano, qtd);
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
        body: JSON.stringify({ plano, trabalhadores: qtd, nome: nome.trim(), cpfCnpj: documento }),
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
      <CabecalhoTela titulo={`Assinar o ${p.nome}`} subtitulo={`${formatarReais(valor)} por mês · cancele quando quiser`} />

      {!nuvem.configurado ? (
        <Banner tom="info" texto="As assinaturas ainda não estão disponíveis. Enquanto isso, aproveite o teste grátis." />
      ) : !nuvem.usuario ? (
        <section className="cartao flex flex-col gap-3 p-5">
          <p className="text-17">Para assinar, entre na sua conta. Assim o plano vale em qualquer celular e seus dados ficam guardados.</p>
          <Link href="/entrar" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primaria px-6 text-17 font-bold text-sobre-primaria">
            <LogIn aria-hidden className="size-5" /> Entrar ou criar conta
          </Link>
        </section>
      ) : link ? (
        <section className="cartao flex flex-col gap-3 p-5">
          <p className="text-17">Pague com Pix ou cartão na página do Asaas.</p>
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primaria px-6 text-17 font-bold text-sobre-primaria">
            <CreditCard aria-hidden className="size-5" /> Abrir a página de pagamento
          </a>
          <p className="text-15 text-texto-2">Assim que o pagamento for confirmado, o plano muda sozinho (com Pix, em poucos minutos).</p>
          <BotaoPrincipal icone={RefreshCw} onClick={() => sincronizarAgora()}>Já paguei, atualizar</BotaoPrincipal>
          <Link href="/planos" className="inline-flex min-h-12 items-center justify-center text-15 font-bold text-primaria-forte underline underline-offset-4">Voltar para Planos</Link>
        </section>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            pagar();
          }}
        >
          {plano === "equipe" && (
            <section className="cartao p-5">
              <Contador
                rotulo="Quantas pessoas na equipe?"
                valor={String(trabalhadores)}
                passo="1 pessoa"
                onMenos={() => setTrabalhadores((t) => Math.max(TRABALHADORES_MIN, t - 1))}
                onMais={() => setTrabalhadores((t) => Math.min(TRABALHADORES_MAX, t + 1))}
                podeMenos={trabalhadores > TRABALHADORES_MIN}
                podeMais={trabalhadores < TRABALHADORES_MAX}
              />
            </section>
          )}
          <CampoTexto rotulo="Nome completo (para a nota)" valor={nome} onChange={setNome} autoComplete="name" />
          <CampoTexto rotulo="CPF ou CNPJ" valor={documento} onChange={setDocumento} inputMode="numeric" ajuda="O provedor de pagamento exige para emitir a cobrança." />
          {erro && <p role="alert" className="text-15 font-bold text-erro-texto">{erro}</p>}
          <BotaoPrincipal tamanho="g" icone={CreditCard} type="submit" disabled={enviando || nome.trim().length < 3 || !docOk}>
            {enviando ? "Abrindo…" : `Pagar ${formatarReais(valor)} com Pix ou cartão`}
          </BotaoPrincipal>
        </form>
      )}

      <p className="flex gap-2 px-1 text-13 text-texto-2">
        <ShieldCheck aria-hidden className="size-4 shrink-0" />
        <span>
          O pagamento é feito no Asaas, instituição de pagamento autorizada. O {MARCA.nome} não vê nem guarda dados do seu cartão. Cobrança mensal; cancele quando quiser em Planos.
        </span>
      </p>
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
