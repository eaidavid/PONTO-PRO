import { DIAS_TESTE, formatarReais, type LinhaExtrato, PLANOS, type Plano } from "@ponto-pro/core";
import { CartaoDinheiro, cx, ListaExtrato } from "@ponto-pro/ui";
import { Calculator, Check, ChevronDown, type LucideIcon, Pointer, Sun, WifiOff, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DEPOIMENTOS } from "../lib/depoimentos";
import { MARCA } from "../lib/marca";
import { Animacoes } from "./_vendas/animacoes";
import { BarraFixa } from "./_vendas/barra-fixa";
import { BotaoCabecalho } from "./_vendas/botao-cabecalho";
import { CalculadoraExtra } from "./_vendas/calculadora-extra";
import { DemoPonto } from "./_vendas/demo-ponto";
import { BotaoComecar, LinkMedido } from "./_vendas/link-medido";

const TITULO = `${MARCA.nome}: saiba quanto vai cair antes do dia do pagamento`;
const DESCRICAO =
  "Bata o ponto no celular e veja todo dia quanto vai cair no seu pagamento, com hora extra e desconto na conta. Para quem trabalha na obra, no comércio, na saúde, nas entregas e por conta própria.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  openGraph: { title: TITULO, description: DESCRICAO, type: "website", locale: "pt_BR", siteName: MARCA.nome },
};

/** Exemplo único da página: R$ 25,00 por hora, um sábado de hora extra que não foi pago. */
const CONTA_EXEMPLO: LinhaExtrato[] = [
  { texto: "Valor da sua hora: R$ 25,00", tipo: "info" },
  { texto: "Semana 176h × R$ 25,00 = R$ 4.400,00", tipo: "ganho" },
  { texto: "Sábado 5h × R$ 25,00 + 50% = R$ 187,50", tipo: "extra" },
  { texto: "Total ganho = R$ 4.587,50", tipo: "total" },
];
const CALCULADO = 458750;
const RECEBIDO = 440000;

const GARANTIAS = ["Só você vê", "Funciona sem internet", "Plano grátis para sempre"];

const DIA_A_DIA: { icone: LucideIcon; titulo: string; texto: string }[] = [
  { icone: WifiOff, titulo: "Funciona sem internet", texto: "Bate o ponto sem sinal, no subsolo ou na estrada. Só precisa de internet no primeiro acesso." },
  { icone: Sun, titulo: "Dá para ler no sol", texto: "O modo Sol forte deixa a letra maior e o contraste alto, para o meio-dia na obra." },
  { icone: Pointer, titulo: "Um toque, mesmo de luva", texto: "Botão grande e sem digitação. Tocou errado? Desfaz na hora." },
  { icone: Calculator, titulo: "Conta de carteira assinada", texto: "INSS, imposto de renda, folga remunerada e vale-transporte já entram no cálculo." },
];

const SO_SEU = [
  { titulo: "Ninguém da empresa tem acesso.", texto: "Seus registros ficam no seu celular. Se você criar uma conta, ficam guardados na sua conta, para não perder nada ao trocar de aparelho." },
  { titulo: "É o seu controle, para você conferir.", texto: "O Pingou não é o ponto oficial da empresa e não substitui o dela. Ele serve para você saber o que tem a receber." },
  { titulo: "Você manda nos seus dados.", texto: "Dá para baixar ou apagar tudo quando quiser." },
];

const PASSOS = [
  { titulo: "Diga como você trabalha", texto: "Sua área, sua escala e quanto ganha. Leva 1 minuto e não pede senha nem cartão." },
  { titulo: "Bata o ponto todo dia", texto: "Entrada, almoço, volta e saída, um toque cada. Esqueceu? Dá para corrigir depois." },
  { titulo: "Veja quanto vai pingar", texto: "O valor do mês sobe a cada dia trabalhado, com a data em que o dinheiro cai." },
];

const SEM_PINGOU = [
  "Hora extra anotada de cabeça, ou num papel que some",
  "Só descobre o valor quando o dinheiro cai",
  "Recebeu a menos e não sabe dizer onde",
  "No fim do mês, não lembra em que dia ficou até mais tarde",
];

const COM_PINGOU = [
  "Cada entrada e saída registrada na hora, com um toque",
  "O valor do mês na tela, todo dia",
  "A conta aberta linha por linha, para comparar com o contracheque",
  "O histórico de cada dia guardado para consultar",
];

const PROFISSOES = [
  ["Pedreiro", "Servente", "Eletricista", "Pintor", "Caixa", "Vendedora", "Repositor", "Enfermeira", "Cuidadora"],
  ["Motorista", "Motoboy", "Entregador", "Diarista", "Porteiro", "Vigilante", "Garçom", "Cozinheira", "Autônomo"],
];

const PRECO = PLANOS.individual.preco;
const PRECO_ANO = PRECO * 12;
/** Centavos por dia, arredondado para cima: "menos de 50 centavos". */
const CENTAVOS_DIA = Math.ceil(PRECO / 30);

const SEM_RISCO = [
  `${DIAS_TESTE} dias com tudo liberado`,
  "Não pede cartão para testar",
  "Cancela quando quiser",
  "O plano Grátis é grátis para sempre",
];

const ORDEM_PLANOS: Plano[] = ["gratis", "individual", "equipe"];

/** As dúvidas sobre privacidade e internet são respondidas no corpo da página, perto dos botões. */
const DUVIDAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Não sou bom de celular. Vou conseguir usar?",
    resposta:
      "Vai. Para bater o ponto é um botão grande, um toque por vez, sem digitar nada. A configuração leva 1 minuto e já vem com modelos prontos para a sua área.",
  },
  {
    pergunta: "O Pingou é o ponto oficial da empresa?",
    resposta:
      "Não. O Pingou é o seu controle pessoal: serve para você acompanhar suas horas e conferir o que recebeu. Ele não substitui o ponto do seu empregador.",
  },
  {
    pergunta: "Os valores são exatos?",
    resposta:
      "São estimativas, feitas com as regras que você informa (valor da hora, escala, percentual de hora extra, descontos). O que vale é a sua folha de pagamento oficial. Se der diferença, o passo a passo ajuda a achar onde.",
  },
  {
    pergunta: "Tenho que baixar na loja de aplicativos?",
    resposta: "Não. O Pingou abre no navegador do celular e pode ser instalado na tela inicial, como um aplicativo.",
  },
  {
    pergunta: "O teste grátis cobra alguma coisa?",
    resposta: `Não. Você usa tudo do plano Individual por ${DIAS_TESTE} dias, sem informar cartão. Só paga se decidir assinar.`,
  },
  {
    pergunta: "Como pago e como cancelo?",
    resposta:
      "Por Pix ou cartão, todo mês. Dá para cancelar quando quiser: o plano vale até o fim do mês já pago e depois volta ao Grátis, sem perder seus registros.",
  },
];

function Gota({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={className}>
      <path d="M256 70C256 70 128 222 128 316a128 128 0 0 0 256 0C384 222 256 70 256 70z" fill="currentColor" />
      <g fill="none" stroke="var(--marca)" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
        <path d="M256 222v188" />
        <path d="M302 262c-8-15-26-24-46-24-27 0-46 15-46 35 0 47 94 25 94 74 0 22-20 38-48 38-23 0-42-10-50-27" />
      </g>
    </svg>
  );
}

/** Um recurso: texto de um lado, um pedaço de verdade do app do outro. */
function Recurso({ titulo, children, visual, invertido }: { titulo: string; children: ReactNode; visual: ReactNode; invertido?: boolean }) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-2 md:gap-14">
      <div data-revelar className={cx("flex flex-col gap-3", invertido && "md:order-2")}>
        <h3 className="display text-24 md:text-32">{titulo}</h3>
        <div className="flex flex-col gap-3 text-20 text-texto-2">{children}</div>
      </div>
      <div data-revelar data-barra className="mx-auto w-full max-w-[420px]">{visual}</div>
    </div>
  );
}

/** A conferência do pagamento, com o mesmo exemplo do passo a passo: o sábado que não foi pago. */
function ConferirExemplo() {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] bg-superficie-2 p-5">
      <dl className="numeros flex flex-col divide-y divide-borda text-17">
        <div className="flex items-baseline justify-between gap-4 pb-3">
          <dt>O Pingou calculou</dt>
          <dd className="text-20 font-bold">{formatarReais(CALCULADO)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 pt-3">
          <dt>Caiu na sua conta</dt>
          <dd className="text-20 font-bold">{formatarReais(RECEBIDO)}</dd>
        </div>
      </dl>
      <p className="flex flex-col rounded-2xl bg-erro-suave px-4 py-3 text-erro-texto">
        <span className="text-17 font-bold">Faltou</span>
        <span className="display numeros text-[2.6rem] leading-none">{formatarReais(CALCULADO - RECEBIDO)}</span>
      </p>
      <p className="numeros text-17">
        <b>Pode ser:</b> sábado, 5h com 50% = {formatarReais(CALCULADO - RECEBIDO)}
      </p>
    </div>
  );
}

const LARGURA = "mx-auto w-full max-w-[1080px] px-5 sm:px-8";
const TITULO_SECAO = "display text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]";

export default function Vendas() {
  return (
    <>
      <Animacoes />

      <header className="sticky top-0 z-20 bg-[color:var(--marca)] text-sobre-marca">
        <div className={cx(LARGURA, "flex min-h-16 items-center justify-between gap-3")}>
          <Link href="/" className="display inline-flex min-h-12 items-center gap-1.5 text-24" aria-label={`${MARCA.nome}, início`}>
            <Gota className="size-8" />
            {MARCA.nome}
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 text-17 font-bold">
            <a href="#planos" className="hidden min-h-12 items-center rounded-full px-4 active:bg-white/10 sm:inline-flex">
              Planos
            </a>
            <Link href="/entrar" className="hidden min-h-12 items-center rounded-full px-4 active:bg-white/10 sm:inline-flex">
              Entrar
            </Link>
            <BotaoCabecalho />
          </nav>
        </div>
      </header>

      <main className="overflow-x-clip">
        <section data-heroi className="fundo-marca overflow-hidden">
          <div className={cx(LARGURA, "grid items-center gap-8 pt-5 pb-12 md:grid-cols-[1.15fr_1fr] md:gap-8 md:pt-14 md:pb-20")}>
            <div className="flex flex-col gap-4 md:gap-5">
              <p className="display text-24 leading-none md:text-32">
                <span aria-hidden data-assinatura>
                  Bateu o ponto, <span data-gota className="text-marca-destaque">pingou.</span>
                </span>
                <span className="sr-only">{MARCA.slogan}</span>
              </p>
              <h1 data-titulo="heroi" className="display text-[clamp(2.5rem,10.6vw,3.9rem)] leading-[0.96]">
                Saiba quanto vai cair antes do dia do pagamento.
              </h1>
              <p data-heroi-item className="max-w-[34ch] text-[clamp(1.12rem,4.4vw,1.4rem)] leading-snug text-sobre-marca-2">
                Bata o ponto no celular. O Pingou soma suas horas, extras e descontos e mostra o valor do mês, todo dia.
              </p>
              <div data-heroi-item className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <BotaoComecar secao="abertura" sobreMarca />
                <a href="#planos" className="hidden min-h-12 items-center justify-center rounded-full px-4 text-17 font-bold underline decoration-white/50 underline-offset-4 active:bg-white/10 sm:inline-flex">
                  Ver os planos
                </a>
              </div>
              <p data-heroi-item className="text-17 text-sobre-marca-2">
                Leva 1 minuto. Não pede cartão nem senha.{" "}
                <Link href="/entrar" className="font-bold whitespace-nowrap text-sobre-marca underline decoration-white/50 underline-offset-4 sm:hidden">
                  Já tenho conta
                </Link>
              </p>
              <ul data-heroi-item className="flex flex-wrap gap-x-5 gap-y-1 text-15 font-bold">
                {GARANTIAS.map((g) => (
                  <li key={g} className="flex items-center gap-1.5">
                    <Check aria-hidden className="size-4 shrink-0 text-marca-destaque" strokeWidth={3.5} />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div data-heroi-demo>
              <div data-heroi-paralaxe>
                <DemoPonto />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="t-extra" className={cx(LARGURA, "grid items-start gap-8 pt-16 md:grid-cols-2 md:gap-14 md:pt-24")}>
          <div className="flex flex-col gap-4 md:sticky md:top-24">
            <h2 id="t-extra" data-titulo="secao" className={TITULO_SECAO}>
              Hora extra que ninguém anota é dinheiro que não pinga.
            </h2>
            <p data-revelar className="max-w-[40ch] text-20 text-texto-2">
              Meia hora a mais por dia parece pouco. Mexa nos números e veja quanto dá no fim do mês.
            </p>
          </div>
          <div data-revelar>
            <CalculadoraExtra />
          </div>
        </section>

        <section aria-labelledby="t-compara" className={cx(LARGURA, "flex flex-col gap-8 pt-16 md:pt-24")}>
          <h2 id="t-compara" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[18ch]")}>
            O mês de quem anota e o mês de quem não anota.
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div data-lado="sem" className="flex flex-col gap-4 rounded-[28px] bg-superficie-2 p-6 md:p-8">
              <h3 className="text-20 font-bold text-texto-2">Sem o Pingou</h3>
              <ul className="flex flex-col gap-3 text-17 text-texto-2">
                {SEM_PINGOU.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <X aria-hidden className="mt-0.5 size-5 shrink-0 text-erro-texto" strokeWidth={3} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div data-lado="com" className="flex flex-col gap-4 rounded-[28px] bg-primaria-suave p-6 md:p-8">
              <h3 className="display text-24">Com o Pingou</h3>
              <ul className="flex flex-col gap-3 text-17 font-bold">
                {COM_PINGOU.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-sucesso-texto" strokeWidth={3} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="t-recursos" className={cx(LARGURA, "flex flex-col gap-14 py-16 md:gap-24 md:py-24")}>
          <h2 id="t-recursos" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[18ch]")}>
            Chega de fazer conta de cabeça.
          </h2>

          <Recurso
            titulo="Quanto vai pingar, e quando"
            visual={
              <CartaoDinheiro
                valor={512444}
                jaGanhou={336472}
                progresso={0.66}
                quando="Cai em 05/12, daqui a 26 dias"
                complemento="faltam 9 dias de trabalho"
              />
            }
          >
            <p>Cada ponto batido atualiza o valor do mês. Hora extra, feriado, falta e desconto entram na conta sozinhos.</p>
            <p>Você sabe quanto já ganhou e quanto ainda falta.</p>
          </Recurso>

          <Recurso
            invertido
            titulo="Por que deu isso?"
            visual={
              <div className="rounded-[24px] bg-superficie-2 px-5 py-2">
                <ListaExtrato linhas={CONTA_EXEMPLO} />
              </div>
            }
          >
            <p>Toda conta vem com o passo a passo, escrito do jeito que se fala. Dá para conferir linha por linha.</p>
          </Recurso>

          <Recurso titulo="Caiu diferente? Ache onde" visual={<ConferirExemplo />}>
            <p>Digite o valor que caiu. O Pingou mostra a diferença e o que pode não ter sido pago.</p>
            <p>Você chega para conversar com o número na mão.</p>
          </Recurso>

          <div data-revelar className="flex flex-col gap-5 border-t border-borda-forte pt-8 md:flex-row md:items-center md:justify-between md:gap-10">
            <p className="max-w-[46ch] text-20">
              <b>Ganha por produção?</b> Lance o metro, a entrega ou a diária. O Pingou soma com as horas e separa por obra.
            </p>
            <BotaoComecar secao="recursos" className="shrink-0 self-start md:self-auto" />
          </div>
        </section>

        <section aria-labelledby="t-dia" className="fundo-marca">
          <div className="flex flex-col gap-10 py-16 md:gap-14 md:py-24">
            <div className={cx(LARGURA, "flex flex-col gap-10")}>
              <h2 id="t-dia" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[16ch]")}>
                Feito para o trabalho de verdade.
              </h2>
              <ul data-revelar-grupo className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {DIA_A_DIA.map(({ icone: Icone, titulo, texto }) => (
                  <li key={titulo} className="flex gap-4">
                    <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/14 text-marca-destaque">
                      <Icone className="size-7" strokeWidth={2.25} />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-20 font-bold">{titulo}</h3>
                      <p className="text-17 text-sobre-marca-2">{texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div aria-hidden className="flex flex-col gap-1 overflow-hidden">
              {PROFISSOES.map((linha, n) => (
                <div key={n} data-faixa={n ? "direita" : "esquerda"} className="display flex w-max gap-x-8 text-[clamp(2.2rem,8vw,4rem)] leading-tight whitespace-nowrap">
                  {[...linha, ...linha].map((nome, k) => (
                    <span key={k} className={((k % linha.length) + n) % 2 ? "text-marca-destaque" : "text-sobre-marca"}>{nome}</span>
                  ))}
                  <span />
                </div>
              ))}
            </div>
            <p data-revelar className={cx(LARGURA, "text-20 text-sobre-marca-2")}>
              <span className="block max-w-[52ch]">
                Obra, comércio, saúde, entregas, serviços ou por conta própria. Por hora, por mês, por diária ou por produção: escolha um modelo pronto e ajuste o que for diferente no seu serviço.
              </span>
            </p>
          </div>
        </section>

        <section aria-labelledby="t-seu" className={cx(LARGURA, "grid gap-8 py-16 md:grid-cols-[1fr_1.3fr] md:gap-14 md:py-24")}>
          <h2 id="t-seu" data-titulo="secao" className={"display text-balance text-[clamp(2.4rem,10vw,4.2rem)] leading-[0.96]"}>
            É seu. O patrão não vê.
          </h2>
          <ul data-revelar-grupo className="flex flex-col divide-y divide-borda-forte border-y border-borda-forte">
            {SO_SEU.map((s) => (
              <li key={s.titulo} className="flex flex-col gap-1 py-5">
                <h3 className="text-20 font-bold">{s.titulo}</h3>
                <p className="max-w-[56ch] text-17 text-texto-2">{s.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="t-passos" className="bg-superficie-2">
          <div className={cx(LARGURA, "flex flex-col gap-10 py-16 md:py-24")}>
            <h2 id="t-passos" data-titulo="secao" className={TITULO_SECAO}>
              Começa em 1 minuto.
            </h2>
            <ol data-revelar-grupo className="grid gap-8 md:grid-cols-3 md:gap-10">
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="flex gap-4 md:flex-col">
                  <span aria-hidden className="display text-[5.5rem] leading-[0.8] text-primaria">{i + 1}</span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-20 font-bold">{p.titulo}</h3>
                    <p className="text-17 text-texto-2">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            <BotaoComecar secao="passos" className="self-start">Bater meu primeiro ponto</BotaoComecar>
          </div>
        </section>

        {DEPOIMENTOS.length > 0 && (
          <section aria-labelledby="t-depoimentos" className={cx(LARGURA, "flex flex-col gap-10 pt-16 md:pt-24")}>
            <h2 id="t-depoimentos" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[16ch]")}>
              Quem já usa conta como é.
            </h2>
            <ul data-revelar-grupo className="grid gap-x-10 gap-y-8 md:grid-cols-3">
              {DEPOIMENTOS.map((d) => (
                <li key={d.nome + d.texto}>
                  <figure className="flex flex-col gap-3 border-t border-borda-forte pt-5">
                    <blockquote className="text-20">“{d.texto}”</blockquote>
                    <figcaption className="text-15 text-texto-2">
                      <b className="text-texto">{d.nome}</b>, {d.funcao}
                      {d.cidade ? `, ${d.cidade}` : ""}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="planos" aria-labelledby="t-planos" className={cx(LARGURA, "flex scroll-mt-16 flex-col gap-8 py-16 md:py-24")}>
          <div className="flex flex-col gap-3">
            <h2 id="t-planos" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[20ch]")}>
              Menos de {CENTAVOS_DIA} centavos por dia. E começa de graça.
            </h2>
            <p className="max-w-[52ch] text-20 text-texto-2">
              Todo mundo ganha {DIAS_TESTE} dias com tudo liberado. Depois você decide: assina ou continua no Grátis.
            </p>
          </div>
          <div data-revelar-grupo className="grid items-start gap-4 md:grid-cols-3">
            {ORDEM_PLANOS.map((id) => {
              const p = PLANOS[id];
              const destaque = id === "individual";
              return (
                <section
                  key={id}
                  aria-labelledby={`plano-${id}`}
                  className={cx("flex flex-col gap-5 rounded-[24px] p-6", destaque ? "fundo-marca order-first md:order-none" : "bg-superficie-2")}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 id={`plano-${id}`} className="text-20 font-bold">{p.nome}</h3>
                      {destaque && (
                        <span className="rounded-full bg-marca-destaque px-3 py-1 text-15 font-bold text-[color:var(--marca)]">{DIAS_TESTE} dias grátis</span>
                      )}
                    </div>
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="display text-44">{p.preco ? formatarReais(p.preco) : "R$ 0"}</span>
                      <span className={cx("text-17", destaque ? "text-sobre-marca-2" : "text-texto-2")}>
                        {p.preco ? (p.porTrabalhador ? "por pessoa, por mês" : "por mês") : "para sempre"}
                      </span>
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {p.resumo.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-17">
                        <Check aria-hidden className={cx("mt-1 size-5 shrink-0", destaque ? "text-marca-destaque" : "text-primaria")} strokeWidth={3} />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <LinkMedido
                    secao={`plano-${id}`}
                    className={cx(
                      "mt-auto inline-flex min-h-14 items-center justify-center rounded-full px-6 text-17 font-bold",
                      destaque ? "bg-white text-[color:var(--marca)]" : "borda border-primaria! bg-superficie text-primaria",
                    )}
                  >
                    {destaque ? `Testar ${DIAS_TESTE} dias grátis` : id === "gratis" ? "Começar no Grátis" : "Começar com a equipe"}
                  </LinkMedido>
                </section>
              );
            })}
          </div>
          <p data-revelar className="numeros max-w-[60ch] rounded-2xl bg-primaria-suave px-5 py-4 text-17">
            O ano inteiro do Individual sai por <b>{formatarReais(PRECO_ANO)}</b>. Um único erro de pagamento desse tamanho, achado com a ajuda do Pingou, já paga os 12 meses.
          </p>
          <ul data-revelar-grupo className="grid gap-x-8 gap-y-2 text-17 font-bold sm:grid-cols-2 lg:grid-cols-4">
            {SEM_RISCO.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-sucesso-texto" strokeWidth={3} />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="t-duvidas" className="bg-superficie-2">
          <div className={cx(LARGURA, "grid gap-8 py-16 md:grid-cols-[1fr_1.6fr] md:gap-14 md:py-24")}>
            <h2 id="t-duvidas" data-titulo="secao" className={TITULO_SECAO}>
              Dúvidas de quem está chegando.
            </h2>
            <div data-revelar-grupo className="divide-y divide-borda-forte border-y border-borda-forte">
              {DUVIDAS.map((d) => (
                <details key={d.pergunta} className="group">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-20 font-bold [&::-webkit-details-marker]:hidden">
                    {d.pergunta}
                    <ChevronDown aria-hidden className="size-6 shrink-0 text-texto-2 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="max-w-[60ch] pb-5 text-17 text-texto-2">{d.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="t-final" className="fundo-marca">
          <div className={cx(LARGURA, "flex flex-col items-start gap-6 py-16 md:py-24")}>
            <h2 id="t-final" data-titulo="secao" className="display max-w-[14ch] text-[clamp(2.4rem,10vw,4.4rem)] leading-[0.95]">
              Quanto vai pingar este mês?
            </h2>
            <p data-revelar className="max-w-[40ch] text-20 text-sobre-marca-2">Bata o primeiro ponto hoje e descubra antes do dia do pagamento.</p>
            <BotaoComecar secao="final" sobreMarca />
            <p className="text-17 text-sobre-marca-2">Sem cartão. Sem senha. 1 minuto.</p>
          </div>
        </section>
      </main>

      <footer className={cx(LARGURA, "flex flex-col gap-4 py-8 text-15 text-texto-2 sm:flex-row sm:items-center sm:justify-between")}>
        <p>
          {MARCA.nome}. {MARCA.slogan} Os valores mostrados no app são estimativas.
        </p>
        <nav aria-label="Rodapé" className="-mx-3 flex flex-wrap font-bold text-texto">
          <Link href="/termos" className="inline-flex min-h-12 items-center px-3 underline underline-offset-4">Termos de uso</Link>
          <Link href="/privacidade" className="inline-flex min-h-12 items-center px-3 underline underline-offset-4">Privacidade</Link>
          <Link href="/entrar" className="inline-flex min-h-12 items-center px-3 underline underline-offset-4">Entrar</Link>
        </nav>
      </footer>

      <BarraFixa />
    </>
  );
}
