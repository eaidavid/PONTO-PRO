"use client";

import {
  calcularPeriodo,
  calcularPrevisao,
  conferirPagamento,
  diasEntre,
  formatarDuracao,
  formatarHorasCurto,
  formatarReais,
  ganhosPorDia,
  gerarContracheque,
  GLOSSARIO,
  type Linha,
  lerReais,
  type Periodo,
  periodoDaData,
  periodoVizinho,
  type ResultadoPeriodo,
  rotuloPeriodo,
  somarDias,
} from "@ponto-pro/core";
import {
  Abas,
  Banner,
  BotaoPrincipal,
  BottomSheet,
  CabecalhoTela,
  CampoNumero,
  CartaoDinheiro,
  cx,
  GraficoDias,
  ListaExtrato,
  TituloSecao,
  ValorDinheiro,
} from "@ponto-pro/ui";
import { ChevronRight, CircleCheck, Download, FileText, MessageCircle, Scale, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { salvarConferencia } from "../../../lib/acoes";
import type { ConferenciaSalva } from "../../../lib/db";
import { type Estado, useAgora, useEstado, useHistoricoLongo } from "../../../lib/estado";
import { MARCA } from "../../../lib/marca";
import { Carregando } from "../../carregando";

type Aba = "resumo" | "contracheque" | "periodos";

// ---------- "De onde vem": linhas agrupadas por natureza ----------

interface Grupo {
  id: string;
  rotulo: string;
  valor: number;
  cor: string;
  linhas: Linha[];
}

function agrupar(r: ResultadoPeriodo): Grupo[] {
  const soma = (l: Linha[]) => l.reduce((t, x) => t + x.valor, 0);
  const por = (f: (l: Linha) => boolean) => r.ganhos.filter(f);
  const grupos: Grupo[] = [
    { id: "base", rotulo: "Trabalho na sua semana", cor: "bg-primaria", linhas: por((l) => l.tipo === "normal" || l.tipo === "salario" || l.tipo === "diaria"), valor: 0 },
    { id: "abono", rotulo: "Feriados e atestados pagos", cor: "bg-primaria/50", linhas: por((l) => l.tipo === "abono"), valor: 0 },
    { id: "extra", rotulo: "Hora extra e adicionais", cor: "faixa-seguranca bg-extra-suave", linhas: por((l) => l.tipo === "extra" || l.tipo === "adicional"), valor: 0 },
    { id: "producao", rotulo: "Produção", cor: "bg-marca-destaque", linhas: por((l) => l.tipo === "producao"), valor: 0 },
    { id: "descontos", rotulo: "Descontos", cor: "bg-erro", linhas: r.descontos, valor: 0 },
  ];
  return grupos.map((g) => ({ ...g, valor: soma(g.linhas) })).filter((g) => g.valor > 0);
}

function Composicao({ r, onToque }: { r: ResultadoPeriodo; onToque: (g: Grupo) => void }) {
  const grupos = agrupar(r);
  const ganhos = grupos.filter((g) => g.id !== "descontos");
  const total = ganhos.reduce((t, g) => t + g.valor, 0) || 1;
  return (
    <section aria-labelledby="de-onde" className="flex flex-col gap-2">
      <TituloSecao id="de-onde">De onde vem</TituloSecao>
      <div className="cartao flex flex-col gap-1 overflow-hidden">
        <div aria-hidden className="mx-4 mt-4 mb-2 flex h-3 gap-[2px] overflow-hidden rounded-full">
          {ganhos.map((g) => (
            <span key={g.id} className={cx("h-full first:rounded-l-full last:rounded-r-full", g.cor)} style={{ width: `${(g.valor / total) * 100}%` }} />
          ))}
        </div>
        <ul className="divide-y divide-borda">
          {grupos.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => onToque(g)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2">
                <span aria-hidden className={cx("size-3 shrink-0 rounded-sm", g.cor)} />
                <span className="flex-1 text-17">{g.rotulo}</span>
                <span className={cx("numeros text-17 font-bold", g.id === "descontos" ? "text-erro-texto" : g.id === "extra" ? "text-extra-texto" : "text-texto")}>
                  {g.id === "descontos" ? "−" : ""}
                  {formatarReais(g.valor)}
                </span>
                <ChevronRight aria-hidden className="size-4 text-texto-2" />
              </button>
            </li>
          ))}
          <li className="flex min-h-14 items-center justify-between gap-3 bg-superficie-2 px-4">
            <span className="text-17 font-bold">Você deve receber</span>
            <ValorDinheiro centavos={r.liquido} />
          </li>
        </ul>
      </div>
    </section>
  );
}

// ---------- contracheque ----------

function Contracheque({ r, estado, onTermo }: { r: ResultadoPeriodo; estado: Estado; onTermo: (t: string) => void }) {
  const cc = gerarContracheque(r, estado.pessoal);
  function compartilhar() {
    const linhas = [
      `*Contracheque estimado — ${cc.referencia}*`,
      `${cc.funcionario}${cc.cargo ? ` · ${cc.cargo}` : ""}`,
      "",
      ...cc.itens.map((i) => `${i.descricao} (${i.referencia}): ${i.desconto ? "−" : ""}${formatarReais(i.provento ?? i.desconto ?? 0)}`),
      "",
      `Ganhos: ${formatarReais(cc.totalProventos)}`,
      `Descontos: −${formatarReais(cc.totalDescontos)}`,
      `*Líquido: ${formatarReais(cc.liquido)}*`,
      "",
      `_${cc.rodape} · ${MARCA.nome}_`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(linhas.join("\n"))}`, "_blank", "noopener");
  }
  return (
    <div className="entrada-escalonada flex flex-col gap-4">
      <article aria-label="Contracheque estimado" className="cartao overflow-hidden print:shadow-none">
        <header className="fundo-marca flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-13 font-bold text-sobre-marca-2">Contracheque estimado</p>
            <p className="display text-24">{cc.empresa}</p>
          </div>
          <span className="numeros shrink-0 whitespace-nowrap rounded-full bg-white/12 px-3 py-1 text-13 font-bold">{cc.referencia}</span>
        </header>
        <div className="grid grid-cols-2 gap-3 border-b border-borda p-4">
          <div>
            <p className="text-13 text-texto-2">Trabalhador</p>
            <p className="text-17 font-bold">{cc.funcionario}</p>
          </div>
          <div>
            <p className="text-13 text-texto-2">Cargo</p>
            <p className="text-17 font-bold">{cc.cargo || "—"}</p>
          </div>
        </div>
        <ul className="divide-y divide-borda print:hidden">
          {cc.itens.map((i) => (
            <li key={i.codigo + i.descricao} className="flex items-center gap-3 px-4 py-3">
              <span className="numeros w-9 shrink-0 text-13 font-bold text-texto-2">{i.codigo}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-17 font-bold">{i.descricao}</span>
                <span className="numeros block text-15 text-texto-2">Ref. {i.referencia}</span>
              </span>
              <span className={cx("numeros text-17 font-bold", i.desconto ? "text-erro-texto" : "text-texto")}>
                {i.desconto ? `−${formatarReais(i.desconto)}` : formatarReais(i.provento ?? 0)}
              </span>
            </li>
          ))}
        </ul>
        <table className="hidden w-full border-collapse text-15 print:table">
          <thead>
            <tr className="border-b border-borda text-left">
              <th className="p-2">Cód.</th><th className="p-2">Descrição</th><th className="p-2">Referência</th><th className="p-2 text-right">Ganhos</th><th className="p-2 text-right">Descontos</th>
            </tr>
          </thead>
          <tbody>
            {cc.itens.map((i) => (
              <tr key={i.codigo + i.descricao} className="border-b border-borda">
                <td className="p-2">{i.codigo}</td><td className="p-2">{i.descricao}</td><td className="p-2">{i.referencia}</td>
                <td className="p-2 text-right">{i.provento ? formatarReais(i.provento) : ""}</td>
                <td className="p-2 text-right">{i.desconto ? formatarReais(i.desconto) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="flex flex-col gap-2 border-t border-borda p-4">
          <div className="flex justify-between text-17">
            <dt><button type="button" onClick={() => onTermo("Proventos")} className="underline decoration-dotted underline-offset-4">Ganhos</button></dt>
            <dd className="numeros font-bold">{formatarReais(cc.totalProventos)}</dd>
          </div>
          <div className="flex justify-between text-17">
            <dt><button type="button" onClick={() => onTermo("Descontos")} className="underline decoration-dotted underline-offset-4">Descontos</button></dt>
            <dd className="numeros font-bold text-erro-texto">−{formatarReais(cc.totalDescontos)}</dd>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-primaria-suave p-4">
            <dt><button type="button" onClick={() => onTermo("Líquido")} className="text-17 font-bold underline decoration-dotted underline-offset-4">Líquido</button></dt>
            <dd><ValorDinheiro centavos={cc.liquido} tamanho="g" className="text-primaria-forte" /></dd>
          </div>
        </dl>
        <p className="flex items-center gap-2 border-t border-borda bg-extra-suave px-4 py-3 text-15 font-bold text-extra-texto">
          <FileText aria-hidden className="size-5 shrink-0" /> Estimativa — sem validade legal
        </p>
      </article>
      <div className="flex flex-col gap-3 pb-2 print:hidden">
        <BotaoPrincipal tamanho="g" icone={Download} onClick={() => window.print()}>Baixar PDF</BotaoPrincipal>
        <BotaoPrincipal variante="secundaria" icone={MessageCircle} onClick={compartilhar}>Enviar no WhatsApp</BotaoPrincipal>
        <p className="text-13 text-texto-2">Calculado pela sua escala até o fechamento. Horas: {formatarDuracao(r.horas.trabalhadoMin)}.</p>
      </div>
    </div>
  );
}

// ---------- períodos e conferência de pagamento ----------

function Periodos({ estado, agora }: { estado: Estado; agora: string }) {
  const perfil = estado.perfil!;
  const fech = perfil.ciclo.diaFechamento;
  const longo = useHistoricoLongo(true, somarDias(agora, -230));
  const [conferindo, setConferindo] = useState<{ periodo: Periodo; r: ResultadoPeriodo } | null>(null);
  const [recebidoTxt, setRecebidoTxt] = useState("");

  const lista = useMemo(() => {
    if (!longo) return null;
    const res: { periodo: Periodo; r: ResultadoPeriodo }[] = [];
    let p = periodoVizinho(periodoDaData(agora, fech), -1, fech);
    for (let i = 0; i < 6; i++) {
      const r = calcularPeriodo({ perfil, periodo: p, registros: longo.registros, lancamentos: longo.lancamentos, itens: estado.itens, feriadosLocais: estado.feriadosLocais });
      res.push({ periodo: p, r });
      p = periodoVizinho(p, -1, fech);
    }
    return res;
  }, [longo, perfil, fech, agora, estado.itens, estado.feriadosLocais]);

  if (!lista) return <p className="py-6 text-center text-15 text-texto-2">Calculando…</p>;
  const conf = new Map<string, ConferenciaSalva>(estado.conferencias.map((c) => [c.fim, c]));
  const recebido = lerReais(recebidoTxt);
  const resultado = conferindo && recebido !== null ? conferirPagamento(conferindo.r, recebido) : null;

  return (
    <div className="entrada-escalonada flex flex-col gap-4">
      <p className="px-1 text-15 text-texto-2">Confira o que você recebeu em cada período fechado. O app compara com a estimativa e mostra de onde a diferença pode vir.</p>
      <ul className="cartao divide-y divide-borda overflow-hidden">
        {lista.map(({ periodo, r }) => {
          const c = conf.get(periodo.fim);
          const dif = c ? c.recebido - c.estimado : 0;
          return (
            <li key={periodo.fim}>
              <button
                type="button"
                onClick={() => {
                  setConferindo({ periodo, r });
                  setRecebidoTxt(c ? (c.recebido / 100).toFixed(2).replace(".", ",") : "");
                }}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="numeros block text-17 font-bold">{rotuloPeriodo(periodo)}</span>
                  <span className={cx("numeros block text-15", !c ? "text-texto-2" : Math.abs(dif) <= 100 ? "text-sucesso-texto" : "text-extra-texto")}>
                    {!c ? (r.horas.trabalhadoMin ? "Toque para conferir o pagamento" : "Sem registros") : Math.abs(dif) <= 100 ? "Pagamento conferido: bate" : `Recebido ${formatarReais(c.recebido)} · ${dif < 0 ? "faltou" : "sobrou"} ${formatarReais(Math.abs(dif))}`}
                  </span>
                </span>
                <span className="numeros text-right text-17 font-bold">
                  {formatarReais(r.liquido)}
                  <span className="block text-13 font-normal text-texto-2">estimado</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <BottomSheet
        aberto={!!conferindo}
        onFechar={() => setConferindo(null)}
        titulo="Conferir pagamento"
        subtitulo={conferindo ? `Período ${rotuloPeriodo(conferindo.periodo)} · estimado ${formatarReais(conferindo.r.liquido)}` : undefined}
        rodape={
          <BotaoPrincipal
            tamanho="g"
            icone={Scale}
            disabled={recebido === null}
            onClick={async () => {
              if (!conferindo || recebido === null) return;
              await salvarConferencia({ inicio: conferindo.periodo.inicio, fim: conferindo.periodo.fim, estimado: conferindo.r.liquido, recebido, em: new Date().toISOString() });
              setConferindo(null);
            }}
          >
            Salvar conferência
          </BotaoPrincipal>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <CampoNumero rotulo="Quanto você recebeu?" prefixo="R$" valor={recebidoTxt} onChange={setRecebidoTxt} placeholder="0,00" ajuda="O valor que caiu na conta ou veio no contracheque." />
          {resultado && (
            <div role="status" className={cx("flex flex-col gap-2 rounded-2xl p-4", resultado.situacao === "igual" ? "bg-sucesso-suave" : "bg-extra-suave")}>
              <p className="flex items-center gap-2 text-17 font-bold">
                {resultado.situacao === "igual" ? <CircleCheck aria-hidden className="size-5 text-sucesso-texto" /> : <TriangleAlert aria-hidden className="size-5 text-extra-texto" />}
                {resultado.frase}
              </p>
              {resultado.pistas.length > 0 && (
                <>
                  <p className="text-15">{resultado.situacao === "a-menos" ? "Pode ser que não tenham pago:" : "Pode ser que não tenham descontado:"}</p>
                  <ul className="list-disc pl-5 text-15">
                    {resultado.pistas.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="text-13 text-texto-2">É uma pista, não uma certeza. Converse com quem paga ou com seu sindicato.</p>
                </>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

// ---------- página ----------

function Ganhos() {
  const estado = useEstado();
  const agora = useAgora();
  const router = useRouter();
  const params = useSearchParams();
  const aba = (params.get("aba") as Aba) || "resumo";
  const [porQue, setPorQue] = useState(false);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [termo, setTermo] = useState<string | null>(null);

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const { perfil, registros, itens, lancamentos, feriadosLocais } = estado;
    const periodo = periodoDaData(agora.data, perfil.ciclo.diaFechamento);
    const previsao = calcularPrevisao({ perfil, periodo, registros, itens, lancamentos, feriadosLocais, agora, hoje: agora.data });
    const grafico = ganhosPorDia({ perfil, periodo: { inicio: periodo.inicio, fim: agora.data }, registros, itens, lancamentos, feriadosLocais, agora });
    return { periodo, previsao, grafico };
  }, [estado, agora]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { periodo, previsao, grafico } = calc;
  const { realizado, previsto, falta } = previsao;
  const dias = diasEntre(agora.data, periodo.fim);
  const quando = dias === 0 ? "fecha hoje" : dias === 1 ? "fecha amanhã" : `fecha em ${dias} dias`;

  return (
    <main className="flex flex-col gap-4 px-4">
      <CabecalhoTela titulo="Ganhos" subtitulo={`Período ${rotuloPeriodo(periodo)} · ${quando}`} />
      <CartaoDinheiro
        valor={previsto.liquido}
        jaGanhou={realizado.liquido}
        falta={falta.valor}
        progresso={previsao.progresso}
        periodo={quando}
        onPorQue={() => setPorQue(true)}
      />
      <div className="print:hidden">
        <Abas
          rotulo="Seções de ganhos"
          valor={aba}
          onChange={(v) => router.replace(v === "resumo" ? "/ganhos" : `/ganhos?aba=${v}`, { scroll: false })}
          opcoes={[
            { id: "resumo", rotulo: "Resumo" },
            { id: "contracheque", rotulo: "Contracheque" },
            { id: "periodos", rotulo: "Períodos" },
          ]}
        />
      </div>

      {aba === "resumo" && (
        <div className="entrada-escalonada flex flex-col gap-5">
          {previsto.avisos.map((a) => (
            <Banner key={a.id} tom={a.id === "descontos-maiores" ? "aviso" : "info"} texto={a.texto} />
          ))}
          {falta.dias > 0 && (
            <p className="px-1 text-17">
              Faltam <b>{falta.dias} {falta.dias === 1 ? "dia" : "dias"}</b> de trabalho ({formatarHorasCurto(falta.horasMin)}) para fechar o período.
            </p>
          )}
          <Composicao r={previsto} onToque={setGrupo} />
          <section aria-label="Ganho por dia" className="cartao p-4">
            <GraficoDias dias={grafico} hoje={agora.data} />
          </section>
          <Link
            href="/metas"
            className="mb-2 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-primaria bg-superficie px-6 text-17 font-bold text-primaria active:bg-primaria-suave"
          >
            <Target aria-hidden className="size-6" /> Quero receber mais
          </Link>
        </div>
      )}
      {aba === "contracheque" && <Contracheque r={previsto} estado={estado} onTermo={setTermo} />}
      {aba === "periodos" && <Periodos estado={estado} agora={agora.data} />}

      <BottomSheet aberto={porQue} onFechar={() => setPorQue(false)} titulo="Por que deu isso?" subtitulo={`Previsão até ${periodo.fim.slice(8, 10)}/${periodo.fim.slice(5, 7)}`}>
        <ListaExtrato linhas={previsao.extrato} />
      </BottomSheet>
      <BottomSheet aberto={!!grupo} onFechar={() => setGrupo(null)} titulo={grupo?.rotulo ?? ""} subtitulo="Conta de cada linha">
        {grupo && (
          <ul className="flex flex-col gap-3 pb-4">
            {grupo.linhas.map((l) => (
              <li key={l.codigo + l.descricao} className="flex flex-col gap-1 rounded-2xl bg-superficie-2 p-4">
                <span className="text-15 text-texto-2">{l.explicacao}</span>
                <span className="numeros text-17 font-bold">{l.conta}</span>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
      <BottomSheet aberto={!!termo} onFechar={() => setTermo(null)} titulo={termo === "Proventos" ? "Ganhos" : (termo ?? "")}>
        <p className="pb-4 text-20">{termo ? GLOSSARIO[termo] : ""}</p>
      </BottomSheet>
    </main>
  );
}

export default function PaginaGanhos() {
  return (
    <Suspense fallback={<Carregando />}>
      <Ganhos />
    </Suspense>
  );
}
