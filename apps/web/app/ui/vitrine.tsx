"use client";

import {
  dataPorExtenso,
  diaDaSemana,
  type DiaRegistro,
  type Etapa,
  formatarDuracao,
  formatarReais,
  horaParaMin,
  horariosComuns,
  minParaHora,
  proximaEtapa,
  saldoDoDia,
  type TipoDia,
} from "@ponto-pro/core";
import {
  abasPadrao,
  Banner,
  BarraNavegacao,
  BarraProgresso,
  BotaoPonto,
  BotaoPrincipal,
  BottomSheet,
  BuscaServico,
  CartaoDinheiro,
  CartaoValor,
  Chip,
  cx,
  EscolhaTipoDia,
  EstadoVazio,
  EtapasDoDia,
  LinhaRegistro,
  LinkPorQue,
  ListaExtrato,
  SeletorHora,
  SeloSugestao,
  SeloTipoDia,
  Skeleton,
  StatusSync,
  Toast,
  useToast,
  ValorDinheiro,
} from "@ponto-pro/ui";
import { Clock, Contrast, Hammer, LogOut, Moon, PackagePlus, Save, Sun, Trash2, Wallet } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AGORA, calcular, HOJE, itens, perfil, registros } from "./demo";

const registrosPorData = new Map(registros.map((r) => [r.data, r]));

type Tema = "claro" | "escuro" | "sol";

const NOME_ETAPA: Record<Etapa, string> = { entrada: "Entrada", almoco: "Almoço", volta: "Volta", saida: "Saída" };

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="flex flex-col gap-4 border-t-[length:var(--borda-largura)] border-borda py-8">
      <div>
        <h2 id={`${id}-t`} className="text-24 font-bold">{titulo}</h2>
        {descricao && <p className="text-15 text-texto-2">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

function Estado({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-13 font-bold text-texto-2">{nome}</span>
      {children}
    </div>
  );
}

function TrocaTema() {
  const [tema, setTema] = useState<Tema | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.tema as Tema | undefined;
    setTema(t ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro"));
  }, []);
  function escolher(t: Tema) {
    setTema(t);
    document.documentElement.dataset.tema = t;
    try {
      localStorage.setItem("pp-tema", t);
    } catch {
      /* modo privado: só nesta visita */
    }
  }
  return (
    <div role="group" aria-label="Aparência" className="flex flex-wrap gap-2">
      <Chip icone={Sun} selecionado={tema === "claro"} onClick={() => escolher("claro")}>Claro</Chip>
      <Chip icone={Moon} selecionado={tema === "escuro"} onClick={() => escolher("escuro")}>Escuro</Chip>
      <Chip icone={Contrast} selecionado={tema === "sol"} onClick={() => escolher("sol")}>Sol forte</Chip>
    </div>
  );
}

const CORES: { nome: string; var: string; uso: string }[] = [
  { nome: "Verde obra", var: "--primaria", uso: "Ações e ganho normal" },
  { nome: "Laranja segurança", var: "--extra", uso: "Hora extra e ganho a mais" },
  { nome: "Vermelho", var: "--erro", uso: "Desconto, falta e erro" },
  { nome: "Verde sucesso", var: "--sucesso", uso: "Concluído" },
  { nome: "Fundo", var: "--fundo", uso: "Fundo das telas" },
  { nome: "Superfície", var: "--superficie", uso: "Cartões e painéis" },
  { nome: "Texto", var: "--texto", uso: "Texto principal" },
  { nome: "Texto secundário", var: "--texto-2", uso: "Rótulos e apoio" },
  { nome: "Borda", var: "--borda", uso: "Divisões" },
];

const TIPOS: [string, string][] = [
  ["text-56", "56 · R$ 5.412"],
  ["text-44", "44 · Valor grande"],
  ["text-32", "32 · Relógio"],
  ["text-24", "24 · Título"],
  ["text-20", "20 · Botão e destaque"],
  ["text-17", "17 · Texto base"],
  ["text-15", "15 · Rótulo"],
  ["text-13", "13 · Detalhe"],
];

/** Tela Hoje montada com os componentes: protótipo do fluxo "bater o ponto do dia inteiro". */
function TelaHoje({ marcacoes, onBater, offline }: { marcacoes: DiaRegistro["marcacoes"]; onBater: () => void; offline: boolean }) {
  const etapa = proximaEtapa(marcacoes);
  const { hoje } = useMemo(() => calcular(marcacoes), [marcacoes]);
  const dia = hoje.dias[0]!;
  const prevista = marcacoes.entrada
    ? minParaHora(horaParaMin(marcacoes.entrada) + dia.escala.horasLiquidasMin + dia.escala.almocoMin)
    : dia.escala.fim ?? "--:--";
  return (
    <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[32px] bg-fundo shadow-min ring-1 ring-[color:var(--borda-cartao)]">
      <div className="fundo-marca flex flex-col gap-1 px-5 pt-5 pb-14">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-white/14 text-20 font-bold">J</span>
          <div className="flex-1 leading-tight">
            <p className="text-20 font-bold">Bom dia, José</p>
            <p className="text-15 text-sobre-marca-2">Obra Jardim</p>
          </div>
        </div>
        <p className="numeros pt-5 text-[min(var(--text-56)*1.15,19vw)] leading-none font-bold tracking-tight">{AGORA.hora}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-17 text-sobre-marca-2 first-letter:uppercase">{dataPorExtenso(HOJE)}</p>
          <StatusSync estado={offline ? "local" : "sincronizado"} sobreMarca />
        </div>
      </div>
      <div className="-mt-8 flex flex-col gap-4 rounded-t-painel bg-fundo px-4 pt-4 pb-6">
        <div className="cartao flex flex-col gap-4 p-4">
          <EtapasDoDia marcacoes={marcacoes} etapaAtual={etapa} />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-15">
              <span className="font-bold text-texto-2">Jornada</span>
              <span className="numeros font-bold">{formatarDuracao(dia.trabalhadoMin)} de {formatarDuracao(dia.escala.horasLiquidasMin)}</span>
            </div>
            <BarraProgresso valor={dia.trabalhadoMin / dia.escala.horasLiquidasMin} rotulo="Jornada de hoje" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CartaoValor rotulo="Trabalhado" valor={formatarDuracao(dia.trabalhadoMin)} icone={Clock} />
          <CartaoValor rotulo="Saída prevista" valor={prevista} icone={LogOut} />
        </div>
        <CartaoValor rotulo="Ganho hoje" valor={<ValorDinheiro centavos={hoje.bruto} tamanho="g" />} tom="primaria" icone={Wallet}>
          <LinkPorQue />
        </CartaoValor>
        <BotaoPonto etapa={etapa} hora={AGORA.hora} offline={offline} onBater={onBater} />
        <BotaoPrincipal variante="secundaria" icone={PackagePlus}>Lançar produção</BotaoPrincipal>
      </div>
    </div>
  );
}

export function Vitrine() {
  const { mostrar } = useToast();
  const [marcacoes, setMarcacoes] = useState<DiaRegistro["marcacoes"]>({ entrada: "07:02" });
  const [offline, setOffline] = useState(false);
  const [sheetPorQue, setSheetPorQue] = useState(false);
  const [sheetDia, setSheetDia] = useState(false);
  const [sheetApagar, setSheetApagar] = useState(false);
  const [horaEditada, setHoraEditada] = useState("17:30");
  const [marcoEditado, setMarcoEditado] = useState<Etapa>("saida");
  const [tipoDia, setTipoDia] = useState<TipoDia>("normal");
  const [chip, setChip] = useState("12:00");
  const { previsao, lista } = useMemo(() => calcular(marcacoes), [marcacoes]);
  const comuns = horariosComuns(perfil.escala);

  function bater() {
    const etapa = proximaEtapa(marcacoes);
    if (!etapa) return;
    const antes = marcacoes;
    setMarcacoes({ ...marcacoes, [etapa]: AGORA.hora });
    mostrar({ texto: `${NOME_ETAPA[etapa]} às ${AGORA.hora}`, desfazer: () => setMarcacoes(antes) });
  }

  const diasLista = [...lista.dias].reverse().slice(0, 10);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col px-4 pb-40">
      <header className="flex flex-col gap-4 py-6">
        <div className="fundo-marca flex flex-col gap-2 rounded-[24px] p-5">
          <p className="text-15 font-bold text-marca-destaque">Ponto Pro · Milestone 1</p>
          <h1 className="text-32 font-bold">Design system</h1>
          <p className="text-17 text-sobre-marca-2">Tokens, componentes e estados. Troque a aparência para conferir os três temas.</p>
        </div>
        <TrocaTema />
      </header>

      <Secao id="hoje" titulo="Prévia: tela Hoje" descricao="Toque no botão para bater o ponto do dia inteiro. O toast permite desfazer por 5 segundos.">
        <div className="flex flex-wrap gap-2">
          <Chip selecionado={offline} icone={Save} onClick={() => setOffline(!offline)}>Simular sem internet</Chip>
          <Chip onClick={() => setMarcacoes({})}>Recomeçar o dia</Chip>
        </div>
        <TelaHoje marcacoes={marcacoes} onBater={bater} offline={offline} />
      </Secao>

      <Secao id="cores" titulo="Cores" descricao="Cada cor tem uma função fixa em todo o app.">
        <ul className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-3">
          {CORES.map((c) => (
            <li key={c.var} className="cartao flex items-center gap-3 p-3">
              <span aria-hidden className="size-10 shrink-0 rounded-xl borda" style={{ background: `var(${c.var})` }} />
              <span className="min-w-0">
                <span className="block text-15 font-bold">{c.nome}</span>
                <span className="block text-13 text-texto-2">{c.uso}</span>
              </span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao id="tipografia" titulo="Tipografia" descricao="Atkinson Hyperlegible. Números com algarismos tabulares.">
        <ul className="flex flex-col gap-2">
          {TIPOS.map(([cls, txt]) => (
            <li key={cls} className={cx("numeros font-bold", cls)}>{txt}</li>
          ))}
        </ul>
      </Secao>

      <Secao id="botao-ponto" titulo="BotaoPonto" descricao="64px, largura total. O texto muda com a etapa e mostra o horário.">
        <Estado nome="Antes da entrada"><BotaoPonto etapa="entrada" hora="07:02" /></Estado>
        <Estado nome="Trabalhando"><BotaoPonto etapa="almoco" hora="12:00" /></Estado>
        <Estado nome="No almoço"><BotaoPonto etapa="volta" hora="13:00" /></Estado>
        <Estado nome="Depois da volta"><BotaoPonto etapa="saida" hora="17:00" /></Estado>
        <Estado nome="Dia encerrado (desativado)"><BotaoPonto etapa={null} hora="17:00" /></Estado>
        <Estado nome="Sem internet"><BotaoPonto etapa="entrada" hora="07:02" offline /></Estado>
        <Estado nome="Carregando"><BotaoPonto etapa="entrada" hora="07:02" carregando /></Estado>
        <Estado nome="Erro"><BotaoPonto etapa="entrada" hora="07:02" erro="Não deu para salvar. Toque de novo." /></Estado>
      </Secao>

      <Secao id="etapas" titulo="EtapasDoDia" descricao="Atual com anel verde; concluídas com check.">
        <Estado nome="Antes da entrada"><EtapasDoDia marcacoes={{}} etapaAtual="entrada" /></Estado>
        <Estado nome="Trabalhando"><EtapasDoDia marcacoes={{ entrada: "07:02" }} etapaAtual="almoco" /></Estado>
        <Estado nome="No almoço"><EtapasDoDia marcacoes={{ entrada: "07:02", almoco: "12:00" }} etapaAtual="volta" /></Estado>
        <Estado nome="Dia encerrado"><EtapasDoDia marcacoes={{ entrada: "07:02", almoco: "12:00", volta: "13:00", saida: "17:04" }} etapaAtual={null} /></Estado>
      </Secao>

      <Secao id="dinheiro" titulo="CartaoDinheiro e CartaoValor" descricao="Calculado pelo motor com os dados do José (período 21/10 a 20/11).">
        <CartaoDinheiro
          valor={previsao.previsto.liquido}
          jaGanhou={previsao.realizado.liquido}
          falta={previsao.falta.valor}
          progresso={previsao.progresso}
          periodo="21/10 a 20/11"
          onPorQue={() => setSheetPorQue(true)}
        />
        <Estado nome="Carregando"><CartaoDinheiro valor={0} jaGanhou={0} falta={0} progresso={0} carregando /></Estado>
        <div className="grid grid-cols-2 gap-3">
          <CartaoValor rotulo="Hora extra" valor={formatarDuracao(previsao.realizado.horas.extraMin)} tom="extra" detalhe="no período" />
          <CartaoValor rotulo="Faltas" valor={formatarDuracao(-540)} tom="erro" detalhe="1 dia" />
          <CartaoValor rotulo="Concluído" valor="5 dias" tom="sucesso" />
          <CartaoValor rotulo="Carregando" valor="" carregando />
        </div>
      </Secao>

      <Secao id="registros" titulo="LinhaRegistro" descricao="Hoje em destaque, fim de semana com fundo leve, saldo colorido. Toque numa linha para editar.">
        <div className="cartao overflow-hidden divide-y divide-borda">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-20 font-bold">21/10 a 20/11</span>
            <span className="text-15 text-texto-2">Período atual</span>
          </div>
          {diasLista.map((d) => (
            <LinhaRegistro
              key={d.data}
              data={d.data}
              marcacoes={d.data === HOJE ? marcacoes : registrosPorData.get(d.data)?.marcacoes}
              tipo={d.tipo}
              trabalhadoMin={d.trabalhadoMin}
              saldoMin={saldoDoDia(d)}
              feriado={d.feriado}
              hoje={d.data === HOJE}
              emAndamento={d.emAndamento}
              fimDeSemana={[0, 6].includes(diaDaSemana(d.data))}
              onClick={() => setSheetDia(true)}
            />
          ))}
        </div>
      </Secao>

      <Secao id="seletor" titulo="BottomSheet + SeletorHora" descricao="Chips com os horários da escala, −5 e +5 minutos. Nunca o seletor nativo pequeno.">
        <BotaoPrincipal variante="secundaria" icone={Clock} onClick={() => setSheetDia(true)}>Editar terça, 04/11</BotaoPrincipal>
        <BotaoPrincipal variante="perigo" icone={Trash2} onClick={() => setSheetApagar(true)}>Apagar registro do dia</BotaoPrincipal>
      </Secao>

      <Secao id="chips" titulo="Chips e tipos de dia">
        <div className="flex flex-wrap gap-2">
          {comuns.map((h) => (
            <Chip key={h} selecionado={chip === h} onClick={() => setChip(h)}>{h}</Chip>
          ))}
          <Chip disabled>Desativado</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["falta", "atestado", "feriado", "folga", "compensado"] as TipoDia[]).map((t) => <SeloTipoDia key={t} tipo={t} />)}
        </div>
        <EscolhaTipoDia valor={tipoDia} onChange={setTipoDia} />
      </Secao>

      <Secao id="busca" titulo="BuscaServico" descricao="Digite sem acento. Se não existir, crie na hora. A prévia está sempre visível.">
        <BuscaServico
          itens={itens}
          onLancar={(l) => mostrar({ texto: `${l.novo ? "Serviço criado e lançado" : "Produção lançada"}: ${l.item.nome}`, desfazer: () => {} })}
        />
        <Estado nome="Digitando “meio fio” (sem hífen): encontra e oferece criar">
          <BuscaServico itens={itens} textoInicial="meio fio" quantidadeInicial="50" onLancar={() => {}} />
        </Estado>
      </Secao>

      <Secao id="banners" titulo="Banner" descricao="Acolhedor, sem culpar a pessoa.">
        <Banner tom="aviso" texto="Os descontos estão maiores que o que você ganhou neste período. Confira em Ajustes." acao={{ rotulo: "Abrir Ajustes", onClick: () => {} }} />
        <Banner tom="erro" texto="Não deu para enviar agora. Seus registros estão guardados no celular." />
        <Banner tom="info" texto="Tem dia sem a saída marcada. Confira em Registros." />
        <Banner tom="sucesso" texto="Tudo enviado. Seus registros estão seguros." />
      </Secao>

      <Secao id="toast" titulo="Toast com desfazer" descricao="Fica 5 segundos. Substitui os modais de confirmação.">
        <Toast texto="Entrada às 07:02" desfazer={() => {}} duracao={600000} />
        <BotaoPrincipal variante="secundaria" onClick={() => mostrar({ texto: "Entrada às 07:02", desfazer: () => {} })}>Mostrar toast</BotaoPrincipal>
      </Secao>

      <Secao id="navegacao" titulo="BarraNavegacao" descricao="5 abas com ícone e rótulo. A quarta muda conforme o perfil.">
        <div className="overflow-hidden rounded-cartao borda"><BarraNavegacao abas={abasPadrao("producao")} ativa="hoje" fixa={false} /></div>
        <div className="overflow-hidden rounded-cartao borda"><BarraNavegacao abas={abasPadrao("metas")} ativa="ganhos" fixa={false} /></div>
      </Secao>

      <Secao id="vazio" titulo="EstadoVazio">
        <EstadoVazio icone={Hammer} frase="Nenhum serviço lançado ainda" acao={{ rotulo: "Lançar produção", icone: PackagePlus, onClick: () => {} }} />
      </Secao>

      <Secao id="botoes" titulo="BotaoPrincipal" descricao="Pílula, largura total, 56 ou 64px.">
        <BotaoPrincipal tamanho="g" icone={Save}>Salvar dia</BotaoPrincipal>
        <BotaoPrincipal variante="secundaria" icone={PackagePlus}>Lançar produção</BotaoPrincipal>
        <BotaoPrincipal variante="perigo" icone={Trash2}>Apagar</BotaoPrincipal>
        <BotaoPrincipal variante="fantasma">Agora não</BotaoPrincipal>
        <BotaoPrincipal carregando>Salvar</BotaoPrincipal>
        <BotaoPrincipal disabled>Desativado</BotaoPrincipal>
      </Secao>

      <Secao id="status" titulo="Status, sugestão e carregamento">
        <div className="flex flex-wrap gap-4">
          <StatusSync estado="local" />
          <StatusSync estado="sincronizando" />
          <StatusSync estado="sincronizado" />
          <StatusSync estado="erro" />
        </div>
        <SeloSugestao />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Secao>

      <BottomSheet aberto={sheetPorQue} onFechar={() => setSheetPorQue(false)} titulo="Por que deu isso?" subtitulo="Passo a passo da previsão até 20/11">
        <ListaExtrato linhas={previsao.extrato} />
      </BottomSheet>

      <BottomSheet
        aberto={sheetDia}
        onFechar={() => setSheetDia(false)}
        titulo="Terça, 04/11"
        subtitulo="07:00 – 17:30 · 9h30"
        rodape={
          <BotaoPrincipal tamanho="g" icone={Save} onClick={() => { setSheetDia(false); mostrar({ texto: "Dia salvo", desfazer: () => {} }); }}>
            Salvar dia
          </BotaoPrincipal>
        }
      >
        <div className="flex flex-col gap-6">
          <div role="group" aria-label="Marcação" className="grid grid-cols-2 gap-2">
            {(["entrada", "almoco", "volta", "saida"] as Etapa[]).map((m) => (
              <Chip key={m} selecionado={marcoEditado === m} onClick={() => setMarcoEditado(m)}>
                {NOME_ETAPA[m]} {m === marcoEditado ? horaEditada : { entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:30" }[m]}
              </Chip>
            ))}
          </div>
          <SeletorHora valor={horaEditada} onChange={setHoraEditada} comuns={comuns} rotulo={NOME_ETAPA[marcoEditado]} />
          <div className="flex flex-col gap-2">
            <span className="text-17 font-bold">Tipo do dia</span>
            <EscolhaTipoDia valor={tipoDia} onChange={setTipoDia} />
          </div>
        </div>
      </BottomSheet>

      <BottomSheet aberto={sheetApagar} onFechar={() => setSheetApagar(false)} titulo="Apagar o registro de 04/11?" subtitulo="Os horários deste dia saem do cálculo.">
        <div className="flex flex-col gap-3 pb-2">
          <BotaoPrincipal variante="perigo" icone={Trash2} onClick={() => { setSheetApagar(false); mostrar({ texto: "Registro apagado", desfazer: () => {} }); }}>
            Sim, apagar
          </BotaoPrincipal>
          <BotaoPrincipal variante="fantasma" onClick={() => setSheetApagar(false)}>Cancelar</BotaoPrincipal>
        </div>
      </BottomSheet>

      <BarraNavegacao abas={abasPadrao("producao")} ativa="hoje" />
    </main>
  );
}
