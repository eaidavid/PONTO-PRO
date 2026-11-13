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

/** O mês sem anotar e o mês anotando, lado a lado, linha por linha. */
const COMPARA: { sem: string; com: string }[] = [
  { sem: "Hora extra anotada de cabeça, ou num papel que some", com: "Cada entrada e saída registrada na hora, com um toque" },
  { sem: "Só descobre o valor quando o dinheiro cai", com: "O valor do mês na tela, todo dia" },
  { sem: "Recebeu a menos e não sabe dizer onde", com: "A conta aberta, linha por linha, para comparar" },
  { sem: "Não lembra em que dia ficou até mais tarde", com: "O histórico de cada dia guardado para consultar" },
];

const PROFISSOES = [
  "Pedreiro", "Servente", "Eletricista", "Pintor", "Caixa", "Vendedora", "Repositor", "Enfermeira", "Cuidadora",
  "Motorista", "Motoboy", "Entregador", "Diarista", "Porteiro", "Vigilante", "Garçom", "Cozinheira", "Autônomo",
];

/** Últimos dias do exemplo, a R$ 25,00 por hora: a terça teve 1h extra a 50%. */
const ULTIMOS_DIAS = [
  { dia: "seg 10", horas: "8h", valor: 20000 },
  { dia: "ter 11", horas: "9h", valor: 23750, extra: true },
  { dia: "qua 12", horas: "8h", valor: 20000 },
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

/** A mesma moldura de celular em toda a página: o produto aparece sempre do mesmo jeito. */
function Tela({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-[30px] border-[6px] border-[#0a100e] bg-fundo text-texto shadow-[0_24px_48px_-28px_rgb(0_0_0/0.5)]">
      <div className="fundo-marca px-4 pt-4 pb-9">
        <p className="text-15 font-bold">{titulo}</p>
      </div>
      <div className="relative -mt-5 flex flex-1 flex-col gap-3 rounded-t-[20px] bg-fundo p-3">{children}</div>
    </div>
  );
}

/** Um recurso: o que ele faz, em cima; a tela do app que faz isso, embaixo. */
function Recurso({ titulo, texto, tela, children }: { titulo: string; texto: string; tela: string; children: ReactNode }) {
  return (
    <li data-barra className="flex w-[84%] shrink-0 snap-center flex-col gap-4 md:w-auto">
      <div className="flex flex-col gap-1.5 md:min-h-[7.5rem]">
        <h3 className="display text-20 md:text-24">{titulo}</h3>
        <p className="text-17 text-texto-2">{texto}</p>
      </div>
      <Tela titulo={tela}>{children}</Tela>
    </li>
  );
}

/** A conferência do pagamento, com o mesmo exemplo do passo a passo: o sábado que não foi pago. */
function ConferirExemplo() {
  return (
    <div className="cartao flex flex-col gap-3 p-4">
      <dl className="numeros flex flex-col divide-y divide-borda text-15">
        <div className="flex items-baseline justify-between gap-4 pb-2.5">
          <dt>O Pingou calculou</dt>
          <dd className="text-17 font-bold">{formatarReais(CALCULADO)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 pt-2.5">
          <dt>Caiu na sua conta</dt>
          <dd className="text-17 font-bold">{formatarReais(RECEBIDO)}</dd>
        </div>
      </dl>
      <p className="flex flex-col rounded-2xl bg-erro-suave px-4 py-3 text-erro-texto">
        <span className="text-15 font-bold">Faltou</span>
        <span className="display numeros text-32 leading-none">{formatarReais(CALCULADO - RECEBIDO)}</span>
      </p>
      <p className="numeros text-15">
        <b>Pode ser:</b> sábado, 5h com 50% = {formatarReais(CALCULADO - RECEBIDO)}
      </p>
    </div>
  );
}

const LARGURA = "mx-auto w-full max-w-[1120px] px-5 sm:px-8";
const SECAO = "py-12 md:py-20";
const TITULO_SECAO = "display text-[clamp(1.65rem,7.2vw,2.35rem)] leading-[1.06] text-balance";

export default function Vendas() {
  return (
    <>
      <Animacoes />

      <header className="sticky top-0 z-20 bg-[color:var(--marca)] text-sobre-marca">
        <div className={cx(LARGURA, "flex min-h-14 items-center justify-between gap-3")}>
          <Link href="/" className="display inline-flex min-h-12 items-center gap-1.5 text-20" aria-label={`${MARCA.nome}, início`}>
            <Gota className="size-7" />
            {MARCA.nome}
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 text-15">
            <a href="#planos" className="hidden min-h-12 items-center rounded-full px-3 text-sobre-marca-2 active:bg-white/10 sm:inline-flex">
              Planos
            </a>
            <Link href="/entrar" className="mr-2 hidden min-h-12 items-center rounded-full px-3 text-sobre-marca-2 active:bg-white/10 sm:inline-flex">
              Entrar
            </Link>
            <BotaoCabecalho />
          </nav>
        </div>
      </header>

      <main className="overflow-x-clip">
        <section data-heroi className="fundo-marca overflow-hidden">
          <div className={cx(LARGURA, "grid items-center gap-7 pt-6 pb-10 md:grid-cols-[1.2fr_1fr] md:gap-10 md:pt-12 md:pb-16")}>
            <div className="flex flex-col gap-3.5 md:gap-5">
              <p className="display text-20 leading-none md:text-24">
                <span aria-hidden data-assinatura>
                  Bateu o ponto, <span data-gota className="text-marca-destaque">pingou.</span>
                </span>
                <span className="sr-only">{MARCA.slogan}</span>
              </p>
              <h1 data-titulo="heroi" className="display text-[clamp(2rem,8.7vw,3.3rem)] leading-[1]">
                Saiba quanto vai cair antes do dia do pagamento.
              </h1>
              <p data-heroi-item className="max-w-[38ch] text-17 leading-snug text-sobre-marca-2 md:text-20">
                Bata o ponto no celular. O Pingou soma suas horas, extras e descontos e mostra o valor do mês, todo dia.
              </p>
              <div data-heroi-item className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <BotaoComecar secao="abertura" sobreMarca />
                <a href="#planos" className="hidden min-h-12 items-center justify-center rounded-full px-4 text-15 font-bold underline decoration-white/50 underline-offset-4 active:bg-white/10 sm:inline-flex">
                  Ver os planos
                </a>
              </div>
              <p data-heroi-item className="text-15 text-sobre-marca-2">
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
            <div data-heroi-demo className="[zoom:0.84] md:[zoom:0.92]">
              <DemoPonto />
            </div>
          </div>
        </section>

        <section aria-labelledby="t-extra" className={cx(LARGURA, SECAO, "flex flex-col gap-6 md:gap-8")}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-10">
            <h2 id="t-extra" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[22ch]")}>
              Hora extra que ninguém anota é dinheiro que não pinga.
            </h2>
            <p data-revelar className="max-w-[36ch] text-17 text-texto-2">
              Meia hora a mais por dia parece pouco. Mexa nos números e veja quanto dá no fim do mês.
            </p>
          </div>
          <div data-revelar>
            <CalculadoraExtra />
          </div>
        </section>

        <section aria-labelledby="t-compara" className={cx(LARGURA, "flex flex-col gap-6 pb-12 md:gap-8 md:pb-20")}>
          <h2 id="t-compara" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[22ch]")}>
            O mês de quem anota e o mês de quem não anota.
          </h2>
          <div className="overflow-hidden rounded-[24px] border border-borda">
            <div aria-hidden className="hidden grid-cols-2 text-17 font-bold md:grid">
              <p className="bg-superficie-2 px-7 py-4 text-texto-2">Sem o Pingou</p>
              <p className="display bg-primaria-suave px-7 py-4 text-20">Com o Pingou</p>
            </div>
            <ul data-revelar-grupo className="flex flex-col divide-y divide-borda">
              {COMPARA.map((c) => (
                <li key={c.sem} className="grid md:grid-cols-2">
                  <p className="flex items-start gap-2.5 bg-superficie-2 px-4 pt-3.5 pb-1.5 text-15 text-texto-2 md:px-7 md:py-4 md:text-17">
                    <X aria-hidden className="mt-0.5 size-4 shrink-0 text-erro-texto md:size-5" strokeWidth={3} />
                    <span><span className="sr-only">Sem o Pingou: </span>{c.sem}</span>
                  </p>
                  <p className="flex items-start gap-2.5 bg-superficie-2 px-4 pt-1.5 pb-3.5 text-17 font-bold md:bg-primaria-suave md:px-7 md:py-4">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-sucesso-texto" strokeWidth={3} />
                    <span><span className="sr-only">Com o Pingou: </span>{c.com}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="t-recursos" className="bg-superficie-2">
          <div className={cx(LARGURA, SECAO, "flex flex-col gap-6 md:gap-10")}>
            <div className="flex flex-col gap-1">
              <h2 id="t-recursos" data-titulo="secao" className={TITULO_SECAO}>
                Chega de fazer conta de cabeça.
              </h2>
              <p className="text-15 text-texto-2 md:hidden">Arraste para o lado para ver as três telas.</p>
            </div>

            <ul
              aria-label="Três telas do Pingou"
              tabIndex={0}
              className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0 md:pb-0"
            >
              <Recurso titulo="Quanto vai pingar, e quando" texto="Cada ponto batido atualiza o valor do mês. Você vê quanto já ganhou e quanto falta." tela="Ganhos do mês">
                <CartaoDinheiro valor={512444} jaGanhou={336472} progresso={0.66} quando="Cai em 05/12, daqui a 26 dias" complemento="faltam 9 dias de trabalho" />
                <ul className="cartao numeros flex flex-col divide-y divide-borda px-4 text-15">
                  {ULTIMOS_DIAS.map((d) => (
                    <li key={d.dia} className="flex items-baseline justify-between gap-3 py-2.5 whitespace-nowrap">
                      <span>
                        <b>{d.dia}</b> · {d.horas}
                        {d.extra ? <span className="text-extra-texto"> · extra</span> : null}
                      </span>
                      <b>{formatarReais(d.valor)}</b>
                    </li>
                  ))}
                </ul>
              </Recurso>

              <Recurso titulo="Por que deu isso?" texto="Toda conta vem com o passo a passo, escrito do jeito que se fala. Dá para conferir linha por linha." tela="De onde vem">
                <div className="cartao px-4 py-1">
                  <ListaExtrato linhas={CONTA_EXEMPLO} />
                </div>
              </Recurso>

              <Recurso titulo="Caiu diferente? Ache onde" texto="Digite o valor que caiu. O Pingou mostra a diferença e o que pode não ter sido pago." tela="Conferir pagamento">
                <ConferirExemplo />
              </Recurso>
            </ul>

            <div data-revelar className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-10">
              <p className="max-w-[52ch] text-17">
                <b>Ganha por produção?</b> Lance o metro, a entrega ou a diária. O Pingou soma com as horas e separa por obra.
              </p>
              <BotaoComecar secao="recursos" className="shrink-0 self-start md:self-auto" />
            </div>
          </div>
        </section>

        <section aria-labelledby="t-dia" className={cx(LARGURA, SECAO, "flex flex-col gap-8 md:gap-10")}>
          <h2 id="t-dia" data-titulo="secao" className={TITULO_SECAO}>
            Feito para o trabalho de verdade.
          </h2>
          <ul data-revelar-grupo className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {DIA_A_DIA.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-3.5 lg:flex-col lg:gap-3">
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-primaria">
                  <Icone className="size-5" strokeWidth={2.25} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-17 font-bold">{titulo}</h3>
                  <p className="text-15 text-texto-2">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <div data-revelar className="flex flex-col gap-4 rounded-[24px] bg-primaria-suave p-5 md:p-8">
            <p className="display flex flex-wrap gap-x-3 gap-y-0.5 text-[clamp(1.25rem,5.2vw,1.9rem)] leading-tight">
              {PROFISSOES.map((nome, k) => (
                <span key={nome} className={k % 2 ? "text-primaria" : "text-texto"}>{nome}</span>
              ))}
            </p>
            <p className="max-w-[60ch] text-17">
              Por hora, por mês, por diária ou por produção. Escolha um modelo pronto e ajuste o que for diferente no seu serviço.
            </p>
          </div>
        </section>

        <section aria-labelledby="t-seu" className="bg-texto text-fundo">
          <div className={cx(LARGURA, SECAO, "flex flex-col gap-6 md:gap-10")}>
            <h2 id="t-seu" data-titulo="secao" className={TITULO_SECAO}>
              É seu. O patrão não vê.
            </h2>
            <ul data-revelar-grupo className="grid gap-x-10 md:grid-cols-3">
              {SO_SEU.map((s) => (
                <li key={s.titulo} className="flex flex-col gap-1 border-t border-current/25 py-4 md:py-5">
                  <h3 className="text-17 font-bold">{s.titulo}</h3>
                  <p className="text-15 opacity-85">{s.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="t-passos" className={cx(LARGURA, SECAO, "flex flex-col gap-7 md:gap-10")}>
          <h2 id="t-passos" data-titulo="secao" className={TITULO_SECAO}>
            Começa em 1 minuto.
          </h2>
          <ol data-revelar-grupo className="grid gap-5 md:grid-cols-3 md:gap-10">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4 md:flex-col md:gap-2">
                <span aria-hidden className="display w-9 shrink-0 text-[3rem] leading-[0.85] text-primaria md:text-[3.5rem]">{i + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-17 font-bold">{p.titulo}</h3>
                  <p className="text-15 text-texto-2">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <BotaoComecar secao="passos" className="self-start">Bater meu primeiro ponto</BotaoComecar>
        </section>

        {DEPOIMENTOS.length > 0 && (
          <section aria-labelledby="t-depoimentos" className={cx(LARGURA, "flex flex-col gap-7 pb-12 md:gap-10 md:pb-20")}>
            <h2 id="t-depoimentos" data-titulo="secao" className={TITULO_SECAO}>
              Quem já usa conta como é.
            </h2>
            <ul data-revelar-grupo className="grid gap-x-10 gap-y-6 md:grid-cols-3">
              {DEPOIMENTOS.map((d) => (
                <li key={d.nome + d.texto}>
                  <figure className="flex flex-col gap-3 border-t border-borda-forte pt-4">
                    <blockquote className="text-17">“{d.texto}”</blockquote>
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

        <section id="planos" aria-labelledby="t-planos" className="scroll-mt-14 bg-superficie-2">
          <div className={cx(LARGURA, SECAO, "flex flex-col gap-6 md:gap-8")}>
            <div className="flex flex-col gap-2">
              <h2 id="t-planos" data-titulo="secao" className={cx(TITULO_SECAO, "max-w-[24ch]")}>
                Menos de {CENTAVOS_DIA} centavos por dia. E começa de graça.
              </h2>
              <p className="max-w-[56ch] text-17 text-texto-2">
                Todo mundo ganha {DIAS_TESTE} dias com tudo liberado. Depois você decide: assina ou continua no Grátis.
              </p>
            </div>
            <div data-revelar-grupo className="grid gap-4 md:grid-cols-3">
              {ORDEM_PLANOS.map((id) => {
                const p = PLANOS[id];
                const destaque = id === "individual";
                return (
                  <section
                    key={id}
                    aria-labelledby={`plano-${id}`}
                    className={cx("flex flex-col gap-4 rounded-[24px] p-5 md:p-6", destaque ? "fundo-marca order-first md:order-none" : "bg-superficie")}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 id={`plano-${id}`} className="text-17 font-bold">{p.nome}</h3>
                        {destaque && (
                          <span className="rounded-full bg-marca-destaque px-3 py-0.5 text-15 font-bold text-[color:var(--marca)]">{DIAS_TESTE} dias grátis</span>
                        )}
                      </div>
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="display text-32">{p.preco ? formatarReais(p.preco) : "R$ 0"}</span>
                        <span className={cx("text-15", destaque ? "text-sobre-marca-2" : "text-texto-2")}>
                          {p.preco ? (p.porTrabalhador ? "por pessoa, por mês" : "por mês") : "para sempre"}
                        </span>
                      </p>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {p.resumo.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-15">
                          <Check aria-hidden className={cx("mt-0.5 size-4 shrink-0", destaque ? "text-marca-destaque" : "text-primaria")} strokeWidth={3} />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <LinkMedido
                      secao={`plano-${id}`}
                      className={cx(
                        "mt-auto inline-flex min-h-12 items-center justify-center rounded-full px-6 text-17 font-bold",
                        destaque ? "bg-white text-[color:var(--marca)]" : "borda border-primaria! text-primaria",
                      )}
                    >
                      {destaque ? `Testar ${DIAS_TESTE} dias grátis` : id === "gratis" ? "Começar no Grátis" : "Começar com a equipe"}
                    </LinkMedido>
                  </section>
                );
              })}
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
              <p data-revelar className="numeros max-w-[52ch] text-15">
                O ano inteiro do Individual sai por <b>{formatarReais(PRECO_ANO)}</b>. Um único erro de pagamento desse tamanho, achado com a ajuda do Pingou, já paga os 12 meses.
              </p>
              <ul className="grid shrink-0 gap-x-6 gap-y-1 text-15 font-bold sm:grid-cols-2">
                {SEM_RISCO.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-sucesso-texto" strokeWidth={3} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="t-duvidas" className={cx(LARGURA, SECAO, "grid gap-5 md:grid-cols-[1fr_1.7fr] md:gap-14")}>
          <h2 id="t-duvidas" data-titulo="secao" className={TITULO_SECAO}>
            Dúvidas de quem está chegando.
          </h2>
          <div className="divide-y divide-borda-forte border-y border-borda-forte">
            {DUVIDAS.map((d) => (
              <details key={d.pergunta} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-2.5 text-17 font-bold [&::-webkit-details-marker]:hidden">
                  {d.pergunta}
                  <ChevronDown aria-hidden className="size-5 shrink-0 text-texto-2 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="max-w-[62ch] pb-4 text-15 text-texto-2">{d.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="t-final" className="fundo-marca">
          <div className={cx(LARGURA, "flex flex-col items-center gap-4 py-14 text-center md:py-20")}>
            <h2 id="t-final" data-titulo="secao" className="display text-[clamp(2rem,8.7vw,3.3rem)] leading-[1] text-balance">
              Quanto vai pingar este mês?
            </h2>
            <p data-revelar className="max-w-[40ch] text-17 text-sobre-marca-2 md:text-20">Bata o primeiro ponto hoje e descubra antes do dia do pagamento.</p>
            <BotaoComecar secao="final" sobreMarca className="mt-2" />
            <p className="text-15 text-sobre-marca-2">Sem cartão. Sem senha. 1 minuto.</p>
          </div>
        </section>
      </main>

      <footer className={cx(LARGURA, "flex flex-col gap-3 py-6 text-15 text-texto-2 sm:flex-row sm:items-center sm:justify-between")}>
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
