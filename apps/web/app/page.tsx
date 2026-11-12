import { DIAS_TESTE, formatarReais, type LinhaExtrato, PLANOS, type Plano } from "@ponto-pro/core";
import { CartaoDinheiro, cx, ListaExtrato } from "@ponto-pro/ui";
import {
  ArrowRight,
  Briefcase,
  Brush,
  Calculator,
  Check,
  ChevronDown,
  HardHat,
  HeartPulse,
  type LucideIcon,
  Pointer,
  Store,
  Sun,
  Truck,
  WifiOff,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DEPOIMENTOS } from "../lib/depoimentos";
import { MARCA } from "../lib/marca";
import { Animacoes } from "./_vendas/animacoes";
import { BotaoCabecalho } from "./_vendas/botao-cabecalho";
import { CalculadoraExtra } from "./_vendas/calculadora-extra";
import { DemoPonto } from "./_vendas/demo-ponto";

const TITULO = `${MARCA.nome}: bateu o ponto, pingou.`;
const DESCRICAO =
  "Bata o ponto no celular e veja na hora quanto vai cair no seu pagamento. Para quem trabalha na obra, no comércio, na saúde, nas entregas e por conta própria.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  openGraph: { title: TITULO, description: DESCRICAO, type: "website", locale: "pt_BR", siteName: MARCA.nome },
};

const CONTA_EXEMPLO: LinhaExtrato[] = [
  { texto: "Valor da sua hora: R$ 25,00", tipo: "info" },
  { texto: "Semana 176h × R$ 25,00 = R$ 4.400,00", tipo: "ganho" },
  { texto: "Sábado 5h × R$ 25,00 + 50% = R$ 187,50", tipo: "extra" },
  { texto: "Total ganho = R$ 4.587,50", tipo: "total" },
];

const PRODUCAO_EXEMPLO = [
  { servico: "Assentar piso", conta: "50 m² × R$ 12,00", valor: 60000 },
  { servico: "Rebocar parede", conta: "30 m² × R$ 8,00", valor: 24000 },
  { servico: "Assentar meio-fio", conta: "40 m × R$ 6,50", valor: 26000 },
];

const DIA_A_DIA: { icone: LucideIcon; titulo: string; texto: string }[] = [
  { icone: WifiOff, titulo: "Funciona sem internet", texto: "Bate o ponto sem sinal, no subsolo ou na estrada. Fica tudo salvo no celular." },
  { icone: Sun, titulo: "Dá para ler no sol", texto: "O modo Sol forte deixa a letra maior e o contraste alto, para o meio-dia na obra." },
  { icone: Pointer, titulo: "Um toque, mesmo de luva", texto: "Botão grande e sem digitação. Tocou errado? Desfaz na hora." },
  { icone: Calculator, titulo: "Conta de carteira assinada", texto: "INSS, imposto de renda, folga remunerada e vale-transporte já entram no cálculo." },
];

const PARA_QUEM: { icone: LucideIcon; titulo: string; texto: string }[] = [
  { icone: HardHat, titulo: "Construção", texto: "Pedreiro, servente, eletricista, pintor, empreiteiro" },
  { icone: Store, titulo: "Comércio", texto: "Loja, mercado e atendimento na escala 6x1" },
  { icone: HeartPulse, titulo: "Saúde", texto: "Plantão 12x36, enfermagem, cuidador" },
  { icone: Truck, titulo: "Entregas e transporte", texto: "Motorista, entregador, motoboy" },
  { icone: Brush, titulo: "Serviços", texto: "Diarista, limpeza, manutenção" },
  { icone: Briefcase, titulo: "Por conta própria", texto: "Por hora, por diária ou por empreita" },
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

const DUVIDAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Meu patrão vê o que eu anoto?",
    resposta:
      "Não. No Grátis e no Individual, só você vê os seus registros. Eles ficam no seu celular e, se você criar uma conta, guardados na sua conta.",
  },
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
    pergunta: "Precisa de internet para usar?",
    resposta: "Só no primeiro acesso. Depois, o app abre e registra o ponto mesmo sem sinal.",
  },
  {
    pergunta: "Onde ficam os meus dados?",
    resposta:
      "No seu celular. Se você criar uma conta, eles também ficam guardados na nuvem, para não perder nada ao trocar de aparelho. Você pode baixar ou apagar tudo quando quiser.",
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

function BotaoComecar({ children = "Começar grátis", sobreMarca, className }: { children?: ReactNode; sobreMarca?: boolean; className?: string }) {
  return (
    <Link
      href="/comecar"
      className={cx(
        "inline-flex min-h-16 items-center justify-center gap-3 rounded-full px-8 text-20 font-bold transition-transform duration-150 active:scale-[0.98]",
        sobreMarca ? "bg-white text-[color:var(--marca)]" : "sombra-botao bg-primaria text-sobre-primaria",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden className="size-6 shrink-0" strokeWidth={2.5} />
    </Link>
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

const LARGURA = "mx-auto w-full max-w-[1080px] px-5 sm:px-8";

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
          <div className={cx(LARGURA, "grid items-center gap-8 pt-6 pb-12 md:grid-cols-[1.1fr_1fr] md:gap-8 md:pt-14 md:pb-20")}>
            <div className="flex flex-col gap-5">
              <h1 data-titulo="heroi" className="display text-[clamp(3rem,13vw,5.6rem)] leading-[0.92]">
                Bateu o ponto, <span data-gota className="text-marca-destaque">pingou.</span>
              </h1>
              <p data-heroi-item className="max-w-[30ch] text-[clamp(1.18rem,4.6vw,1.5rem)] leading-snug text-sobre-marca-2">
                Bata o ponto no celular e veja na hora quanto vai cair no seu pagamento, e quanto ainda falta.
              </p>
              <div data-heroi-item className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <BotaoComecar sobreMarca />
                <a href="#planos" className="hidden min-h-12 items-center justify-center rounded-full px-4 text-17 font-bold underline decoration-white/50 underline-offset-4 active:bg-white/10 sm:inline-flex">
                  Ver os planos
                </a>
              </div>
              <p data-heroi-item className="text-17 text-sobre-marca-2">
                {DIAS_TESTE} dias com tudo liberado. Não pede cartão nem senha.{" "}
                <Link href="/entrar" className="font-bold whitespace-nowrap text-sobre-marca underline decoration-white/50 underline-offset-4 sm:hidden">
                  Já tenho conta
                </Link>
              </p>
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
            <h2 id="t-extra" data-titulo="secao" className="display text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
              Hora extra que ninguém anota é dinheiro que não pinga.
            </h2>
            <p data-revelar className="max-w-[40ch] text-20 text-texto-2">
              Meia hora a mais na semana parece pouco. Mexa nos números e veja quanto isso dá no fim do mês.
            </p>
          </div>
          <div data-revelar>
            <CalculadoraExtra />
          </div>
        </section>

        <section aria-labelledby="t-compara" className={cx(LARGURA, "flex flex-col gap-8 pt-16 md:pt-24")}>
          <h2 id="t-compara" data-titulo="secao" className="display max-w-[18ch] text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
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
          <h2 id="t-recursos" data-titulo="secao" className="display max-w-[18ch] text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
            Chega de fazer conta de cabeça no fim do mês.
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
            <p>Você sabe quanto já ganhou e quanto ainda falta trabalhar para fechar o período.</p>
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
            <p>Recebeu diferente? Digite o valor que caiu e o Pingou mostra a diferença e o que pode não ter sido pago.</p>
          </Recurso>

          <Recurso
            titulo="Ganha por produção? Lance o que fez"
            visual={
              <ul className="divide-y divide-borda rounded-[24px] bg-superficie-2 px-5">
                {PRODUCAO_EXEMPLO.map((p) => (
                  <li key={p.servico} className="flex items-center justify-between gap-4 py-4">
                    <span className="flex flex-col">
                      <span className="text-17 font-bold">{p.servico}</span>
                      <span className="numeros text-15 text-texto-2">{p.conta}</span>
                    </span>
                    <span className="numeros text-20 font-bold">{formatarReais(p.valor)}</span>
                  </li>
                ))}
              </ul>
            }
          >
            <p>Metro de piso, parede rebocada, entrega, diária. Você lança a quantidade e o Pingou soma com as horas.</p>
            <p>Trabalha em mais de uma obra? Cada dia fica marcado na obra certa.</p>
          </Recurso>
        </section>

        <section aria-labelledby="t-dia" className="fundo-marca">
          <div className={cx(LARGURA, "flex flex-col gap-10 py-16 md:py-24")}>
            <h2 id="t-dia" data-titulo="secao" className="display max-w-[16ch] text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
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
        </section>

        <section aria-labelledby="t-quem" className="flex flex-col gap-10 py-16 md:py-24">
          <div className={LARGURA}>
            <h2 id="t-quem" data-titulo="secao" className="display max-w-[16ch] text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
              Serve para o seu jeito de trabalhar.
            </h2>
          </div>
          <div aria-hidden className="flex flex-col gap-2 overflow-hidden">
            {PROFISSOES.map((linha, n) => (
              <div key={n} data-faixa={n ? "direita" : "esquerda"} className="display flex w-max gap-x-8 text-[clamp(2.2rem,8vw,4rem)] leading-tight whitespace-nowrap">
                {[...linha, ...linha].map((nome, k) => (
                  <span key={k} className={((k % linha.length) + n) % 2 ? "text-primaria" : "text-texto"}>{nome}</span>
                ))}
                <span />
              </div>
            ))}
          </div>
          <div className={cx(LARGURA, "flex flex-col gap-8")}>
            <ul data-revelar-grupo className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {PARA_QUEM.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="flex items-center gap-4 border-t border-borda py-4">
                  <Icone aria-hidden className="size-7 shrink-0 text-primaria" strokeWidth={2} />
                  <div>
                    <h3 className="text-17 font-bold">{titulo}</h3>
                    <p className="text-15 text-texto-2">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p data-revelar className="max-w-[52ch] text-20 text-texto-2">
              Por hora, por mês, por diária, por produção ou tudo junto. Você escolhe um modelo pronto e ajusta o que for diferente no seu serviço.
            </p>
          </div>
        </section>

        <section aria-labelledby="t-passos" className="bg-superficie-2">
          <div className={cx(LARGURA, "flex flex-col gap-10 py-16 md:py-24")}>
            <h2 id="t-passos" data-titulo="secao" className="display text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
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
            <BotaoComecar className="self-start" />
          </div>
        </section>

        {DEPOIMENTOS.length > 0 && (
          <section aria-labelledby="t-depoimentos" className={cx(LARGURA, "flex flex-col gap-10 pt-16 md:pt-24")}>
            <h2 id="t-depoimentos" data-titulo="secao" className="display max-w-[16ch] text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
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

        <section aria-labelledby="t-porque" className="bg-texto text-fundo">
          <div className={cx(LARGURA, "flex flex-col gap-10 py-16 md:py-24")}>
            <h2 id="t-porque" data-titulo="secao" className="display max-w-[20ch] text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
              Menos de {CENTAVOS_DIA} centavos por dia para nunca mais receber no escuro.
            </h2>
            <ul data-revelar-grupo className="grid gap-x-10 gap-y-8 md:grid-cols-3">
              <li className="flex flex-col gap-2">
                <span data-contar={PRECO} className="display numeros text-[clamp(2.6rem,10vw,3.6rem)] leading-none">{formatarReais(PRECO)}</span>
                <p className="text-17 opacity-85">por mês no plano Individual. Dá menos de {CENTAVOS_DIA} centavos por dia.</p>
              </li>
              <li className="flex flex-col gap-2">
                <span data-contar={PRECO_ANO} className="display numeros text-[clamp(2.6rem,10vw,3.6rem)] leading-none">{formatarReais(PRECO_ANO)}</span>
                <p className="text-17 opacity-85">é o ano inteiro. Um único erro de pagamento desse tamanho, achado com a ajuda do Pingou, já paga os 12 meses.</p>
              </li>
              <li className="flex flex-col gap-2">
                <span className="display numeros text-[clamp(2.6rem,10vw,3.6rem)] leading-none">{DIAS_TESTE} dias</span>
                <p className="text-17 opacity-85">para testar tudo sem pagar e sem informar cartão. Não gostou? Continua no Grátis e não deve nada.</p>
              </li>
            </ul>
            <BotaoComecar className="self-start">Testar {DIAS_TESTE} dias grátis</BotaoComecar>
          </div>
        </section>

        <section id="planos" aria-labelledby="t-planos" className={cx(LARGURA, "flex scroll-mt-16 flex-col gap-8 py-16 md:py-24")}>
          <div className="flex flex-col gap-3">
            <h2 id="t-planos" data-titulo="secao" className="display text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
              Comece de graça. Assine se valer a pena.
            </h2>
            <p className="max-w-[52ch] text-20 text-texto-2">
              Todo mundo começa com {DIAS_TESTE} dias do plano Individual liberado. Depois você decide: assina ou continua no Grátis.
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
                  className={cx("flex flex-col gap-5 rounded-[24px] p-6", destaque ? "fundo-marca" : "bg-superficie-2")}
                >
                  <div className="flex flex-col gap-1">
                    <h3 id={`plano-${id}`} className="text-20 font-bold">{p.nome}</h3>
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
                  <Link
                    href="/comecar"
                    className={cx(
                      "mt-auto inline-flex min-h-14 items-center justify-center rounded-full px-6 text-17 font-bold",
                      destaque ? "bg-white text-[color:var(--marca)]" : "borda border-primaria! bg-superficie text-primaria",
                    )}
                  >
                    {destaque ? `Testar ${DIAS_TESTE} dias grátis` : id === "gratis" ? "Começar grátis" : "Começar com a equipe"}
                  </Link>
                </section>
              );
            })}
          </div>
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
            <h2 id="t-duvidas" data-titulo="secao" className="display text-[clamp(2rem,7.5vw,3.3rem)] leading-[1.02]">
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
            <BotaoComecar sobreMarca />
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
    </>
  );
}
