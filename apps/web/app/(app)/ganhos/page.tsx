"use client";

import {
  calcularPrevisao,
  datasEntre,
  formatarDuracao,
  formatarHorasCurto,
  formatarReais,
  ganhoDoDia,
  gerarContracheque,
  GLOSSARIO,
  type Linha,
  periodoDaData,
  rotuloPeriodo,
} from "@ponto-pro/core";
import {
  Abas,
  Banner,
  BotaoPrincipal,
  BottomSheet,
  CabecalhoTela,
  CartaoDinheiro,
  CartaoValor,
  cx,
  GraficoDias,
  ListaExtrato,
  ValorDinheiro,
} from "@ponto-pro/ui";
import { CalendarDays, Clock, Download, FileText, MessageCircle, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAgora, useEstado } from "../../../lib/estado";
import { Carregando } from "../../carregando";

type Aba = "resumo" | "previsao" | "contracheque";

function ListaLinhas({ titulo, linhas, desconto, onToque }: { titulo: string; linhas: Linha[]; desconto?: boolean; onToque: (l: Linha) => void }) {
  if (linhas.length === 0) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="display text-24">{titulo}</h2>
      <ul className="cartao divide-y divide-borda overflow-hidden">
        {linhas.map((l) => (
          <li key={l.codigo + l.descricao}>
            <button type="button" onClick={() => onToque(l)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2">
              <span
                aria-hidden
                className={cx(
                  "h-9 w-1.5 shrink-0 rounded-full",
                  desconto ? "bg-erro" : l.tipo === "extra" ? "faixa-seguranca bg-extra-suave" : l.tipo === "producao" ? "bg-marca-destaque" : "bg-primaria",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-17 font-bold">{l.descricao}</span>
                <span className="numeros block text-15 text-texto-2">{l.referencia}</span>
              </span>
              <span className={cx("numeros text-17 font-bold", desconto ? "text-erro-texto" : l.tipo === "extra" ? "text-extra-texto" : "text-texto")}>
                {desconto ? "−" : ""}{formatarReais(l.valor)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Ganhos() {
  const estado = useEstado();
  const agora = useAgora();
  const [aba, setAba] = useState<Aba>("resumo");
  const [porQue, setPorQue] = useState(false);
  const [linha, setLinha] = useState<Linha | null>(null);
  const [termo, setTermo] = useState<string | null>(null);

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const { perfil, registros, itens, lancamentos } = estado;
    const periodo = periodoDaData(agora.data, perfil.ciclo.diaFechamento);
    const previsao = calcularPrevisao({ perfil, periodo, registros, itens, lancamentos, agora, hoje: agora.data });
    const grafico = datasEntre(periodo.inicio, agora.data).map((data) => {
      const r = ganhoDoDia({ perfil, data, registros, itens, lancamentos, agora });
      const extra = r.ganhos.filter((l) => l.tipo === "extra").reduce((t, l) => t + l.valor, 0);
      return { data, normal: r.bruto - extra, extra };
    });
    return { periodo, previsao, grafico };
  }, [estado, agora]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { pessoal, perfil } = estado;
  const { periodo, previsao, grafico } = calc;
  const { realizado, previsto, falta } = previsao;
  const cc = gerarContracheque(previsto, { ...pessoal, cargo: pessoal.cargo });

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
      `_${cc.rodape} · Ponto Pro_`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(linhas.join("\n"))}`, "_blank", "noopener");
  }

  return (
    <main className="flex flex-col gap-4 px-4">
      <CabecalhoTela titulo="Ganhos" subtitulo={`Período ${rotuloPeriodo(periodo)} · fecha dia ${perfil.ciclo.diaFechamento}`} />
      <div className="print:hidden">
        <Abas
          rotulo="Seções de ganhos"
          valor={aba}
          onChange={setAba}
          opcoes={[
            { id: "resumo", rotulo: "Resumo" },
            { id: "previsao", rotulo: "Previsão" },
            { id: "contracheque", rotulo: "Contracheque" },
          ]}
        />
      </div>

      {aba === "resumo" && (
        <div className="entrada-escalonada flex flex-col gap-4">
          <CartaoDinheiro
            valor={previsto.liquido}
            jaGanhou={realizado.liquido}
            falta={falta.valor}
            progresso={previsao.progresso}
            periodo={rotuloPeriodo(periodo)}
            onPorQue={() => setPorQue(true)}
          />
          {previsto.avisos.map((a) => (
            <Banner key={a.id} tom={a.id === "descontos-maiores" ? "aviso" : "info"} texto={a.texto} />
          ))}
          <section className="cartao p-4">
            <GraficoDias dias={grafico} hoje={agora.data} />
          </section>
          <ListaLinhas titulo="Ganhos" linhas={realizado.ganhos} onToque={setLinha} />
          <ListaLinhas titulo="Descontos" linhas={realizado.descontos} desconto onToque={setLinha} />
          <p className="pb-2 text-13 text-texto-2">Ganhos e descontos até hoje. A previsão completa está na aba Previsão.</p>
        </div>
      )}

      {aba === "previsao" && (
        <div className="entrada-escalonada flex flex-col gap-4">
          <section className="fundo-marca flex flex-col gap-1 rounded-[24px] p-5">
            <span className="text-15 font-bold text-sobre-marca-2">Ainda falta receber</span>
            <ValorDinheiro centavos={falta.valor} tamanho="gg" />
            <span className="text-15 text-sobre-marca-2">se você cumprir a sua semana até {periodo.fim.slice(8, 10)}/{periodo.fim.slice(5, 7)}</span>
          </section>
          <div className="grid grid-cols-2 gap-3">
            <CartaoValor rotulo="Dias de trabalho" valor={String(falta.dias)} icone={CalendarDays} detalhe="até o fechamento" />
            <CartaoValor rotulo="Horas" valor={formatarHorasCurto(falta.horasMin)} icone={Clock} detalhe="pela sua escala" />
          </div>
          <section className="cartao flex flex-col gap-1 p-4">
            <h2 className="display text-24">Passo a passo</h2>
            <ListaExtrato linhas={previsao.extrato.filter((l) => l.tipo !== "titulo")} />
          </section>
          <Link
            href="/metas"
            className="mb-2 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-primaria bg-superficie px-6 text-17 font-bold text-primaria active:bg-primaria-suave"
          >
            <Target aria-hidden className="size-6" /> Quero receber mais
          </Link>
        </div>
      )}

      {aba === "contracheque" && (
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

            <ul className="flex flex-col gap-2 p-4 print:hidden">
              {cc.itens.map((i) => (
                <li key={i.codigo + i.descricao} className="flex items-center gap-3 rounded-2xl bg-superficie-2 p-3">
                  <span className="numeros w-10 shrink-0 text-13 font-bold text-texto-2">{i.codigo}</span>
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
                <dt>
                  <button type="button" onClick={() => setTermo("Proventos")} className="underline decoration-dotted underline-offset-4">Ganhos</button>
                </dt>
                <dd className="numeros font-bold">{formatarReais(cc.totalProventos)}</dd>
              </div>
              <div className="flex justify-between text-17">
                <dt>
                  <button type="button" onClick={() => setTermo("Descontos")} className="underline decoration-dotted underline-offset-4">Descontos</button>
                </dt>
                <dd className="numeros font-bold text-erro-texto">−{formatarReais(cc.totalDescontos)}</dd>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-2xl bg-primaria-suave p-4">
                <dt>
                  <button type="button" onClick={() => setTermo("Líquido")} className="text-17 font-bold underline decoration-dotted underline-offset-4">Líquido</button>
                </dt>
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
            <p className="text-13 text-texto-2">Calculado pela sua escala até o fechamento. Horas trabalhadas: {formatarDuracao(previsto.horas.trabalhadoMin)}.</p>
          </div>
        </div>
      )}

      <BottomSheet aberto={porQue} onFechar={() => setPorQue(false)} titulo="Por que deu isso?" subtitulo={`Previsão até ${periodo.fim.slice(8, 10)}/${periodo.fim.slice(5, 7)}`}>
        <ListaExtrato linhas={previsao.extrato} />
      </BottomSheet>
      <BottomSheet aberto={!!linha} onFechar={() => setLinha(null)} titulo={linha?.descricao ?? ""} subtitulo={linha?.explicacao}>
        {linha && (
          <p className="numeros rounded-2xl bg-superficie-2 p-4 text-20 font-bold">{linha.conta}</p>
        )}
      </BottomSheet>
      <BottomSheet aberto={!!termo} onFechar={() => setTermo(null)} titulo={termo === "Proventos" ? "Ganhos" : termo ?? ""}>
        <p className="pb-4 text-20">{termo ? GLOSSARIO[termo] : ""}</p>
      </BottomSheet>
    </main>
  );
}
