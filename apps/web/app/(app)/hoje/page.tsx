"use client";

import {
  dataPorExtenso,
  type Etapa,
  extratoDoPeriodo,
  feriadosDoIntervalo,
  formatarDuracao,
  formatarQuantidade,
  formatarReais,
  ganhoDoDia,
  horaParaMin,
  minParaHora,
  MODELOS,
  proximaEtapa,
  rotuloUnidade,
  saudacao,
  valorProducao,
} from "@ponto-pro/core";
import {
  Banner,
  BarraProgresso,
  BotaoPonto,
  cx,
  BotaoPrincipal,
  BottomSheet,
  EtapasDoDia,
  LinkPorQue,
  ListaExtrato,
  StatusSync,
  useToast,
  ValorDinheiro,
} from "@ponto-pro/ui";
import { Clock, Hammer, LogIn, LogOut, PackagePlus, Utensils, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { baterPonto, restaurarRegistro } from "../../../lib/acoes";
import { primeiroNome, useAgora, useEstado } from "../../../lib/estado";
import { Carregando } from "../../carregando";

const NOME: Record<Etapa, string> = { entrada: "Entrada", almoco: "Almoço", volta: "Volta do almoço", saida: "Saída" };
const ICONE = { entrada: LogIn, almoco: Utensils, volta: Hammer, saida: LogOut } as const;

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const at = () => setOnline(navigator.onLine);
    at();
    window.addEventListener("online", at);
    window.addEventListener("offline", at);
    return () => {
      window.removeEventListener("online", at);
      window.removeEventListener("offline", at);
    };
  }, []);
  return online;
}

export default function Hoje() {
  const estado = useEstado();
  const agora = useAgora();
  const online = useOnline();
  const { mostrar } = useToast();
  const [porQue, setPorQue] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string>();

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const { perfil, registros, itens, lancamentos } = estado;
    const r = ganhoDoDia({ perfil, data: agora.data, registros, itens, lancamentos, agora });
    const feriado = feriadosDoIntervalo(agora.data, agora.data).get(agora.data);
    return { r, dia: r.dias[0]!, feriado };
  }, [estado, agora]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { perfil, registros, lancamentos, pessoal, preferencias } = estado;
  const { r, dia, feriado } = calc;
  const registro = registros.find((x) => x.data === agora.data);
  const marcacoes = registro?.marcacoes ?? {};
  const etapa = registro && (registro.tipo === "falta" || registro.tipo === "atestado") ? null : proximaEtapa(marcacoes);
  const previstoMin = dia.escala.trabalha ? dia.escala.horasLiquidasMin : 0;
  const almocoFeito = marcacoes.almoco && marcacoes.volta ? (horaParaMin(marcacoes.volta) - horaParaMin(marcacoes.almoco) + 1440) % 1440 : dia.escala.almocoMin;
  const saidaPrevista = marcacoes.saida ?? (marcacoes.entrada && previstoMin ? minParaHora(horaParaMin(marcacoes.entrada) + previstoMin + almocoFeito) : dia.escala.fim);
  const nome = primeiroNome(pessoal);
  const usaProducao = perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto";

  async function bater() {
    if (!etapa || !agora) return;
    setErro(undefined);
    setSalvando(true);
    try {
      const antes = await baterPonto(agora.data, etapa, agora.hora);
      mostrar({ texto: `${NOME[etapa]} às ${agora.hora}`, desfazer: () => restaurarRegistro(agora.data, antes) });
    } catch {
      setErro("Não deu para salvar. Toque de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const recentes = [
    ...(["saida", "volta", "almoco", "entrada"] as Etapa[])
      .filter((e) => marcacoes[e])
      .map((e) => ({ id: e, icone: ICONE[e], titulo: NOME[e], detalhe: "Hoje", valor: marcacoes[e]! })),
    ...lancamentos.slice(0, 3).map((l) => {
      const item = estado.itens.find((i) => i.id === l.itemId);
      return {
        id: l.id,
        icone: PackagePlus,
        titulo: item?.nome ?? "Serviço",
        detalhe: `${formatarQuantidade(l.quantidade)} ${rotuloUnidade(item?.unidade ?? "un")} · ${l.data === agora.data ? "hoje" : l.data.slice(8, 10) + "/" + l.data.slice(5, 7)}`,
        valor: formatarReais(valorProducao(l.quantidade, l.precoUnitario)),
      };
    }),
  ].slice(0, 5);

  return (
    <main>
      <section className="fundo-marca flex flex-col gap-1 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-12">
        <div className="flex items-center gap-3 pt-2">
          <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-white/14 text-20 font-bold">
            {(nome ?? "V")[0]!.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-20 font-bold">{saudacao(agora.minutos)}{nome ? `, ${nome}` : ""}</p>
            <p className="truncate text-15 text-sobre-marca-2">{pessoal.empresa?.trim() || pessoal.cargo?.trim() || MODELOS[perfil.area].nome}</p>
          </div>
        </div>
        <p className="display pt-4 text-relogio" aria-label={`Agora são ${agora.hora}`}>{agora.hora}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-17 text-sobre-marca-2 first-letter:uppercase">{dataPorExtenso(agora.data)}</p>
          <StatusSync estado="local" sobreMarca />
        </div>
      </section>

      <div className="entrada-escalonada relative -mt-8 flex flex-col gap-4 rounded-t-painel bg-fundo px-4 pt-4">
        {feriado ? (
          <Banner tom="info" texto={`Hoje é feriado: ${feriado.nome}. Se trabalhar, as horas contam como extra.`} />
        ) : !dia.escala.trabalha && !marcacoes.entrada ? (
          <Banner tom="info" texto="Hoje é folga pela sua escala. Se trabalhar, as horas contam como extra." />
        ) : registro?.tipo === "falta" || registro?.tipo === "atestado" ? (
          <Banner tom="info" texto={`Hoje está marcado como ${registro.tipo}. Para mudar, abra Registros.`} />
        ) : null}

        <div className="cartao flex flex-col gap-4 p-4">
          <EtapasDoDia marcacoes={marcacoes} etapaAtual={etapa} />
          {previstoMin > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-15">
                <span className="font-bold text-texto-2">Jornada</span>
                <span className="numeros font-bold">
                  {formatarDuracao(dia.trabalhadoMin)} de {formatarDuracao(previstoMin)}
                </span>
              </div>
              <BarraProgresso
                valor={dia.trabalhadoMin / previstoMin}
                excedente={Math.max(0, dia.trabalhadoMin - previstoMin) / previstoMin}
                rotulo="Jornada de hoje"
                marcas={Math.round(previstoMin / 60)}
              />
            </div>
          )}
        </div>

        <BotaoPonto etapa={etapa} hora={agora.hora} offline={!online} carregando={salvando} erro={erro} som={preferencias.som} onBater={bater} />

        <section aria-label="Resumo de hoje" className="cartao @container flex flex-col gap-1 px-4 pt-3 pb-1">
          <dl className="grid grid-cols-1 divide-y divide-borda @[19rem]:grid-cols-3 @[19rem]:divide-x @[19rem]:divide-y-0">
            {[
              { rotulo: "Trabalhado", icone: Clock, valor: <span className="display text-24">{formatarDuracao(dia.trabalhadoMin)}</span> },
              { rotulo: marcacoes.saida ? "Saída" : "Saída prevista", icone: LogOut, valor: <span className="display text-24">{saidaPrevista ?? "—"}</span> },
              { rotulo: "Ganho hoje", icone: Wallet, valor: <ValorDinheiro centavos={r.bruto} className="text-primaria" /> },
            ].map((x, i) => (
              <div
                key={x.rotulo}
                className={cx(
                  "flex items-center justify-between gap-2 py-2.5 @[19rem]:flex-col @[19rem]:items-start @[19rem]:justify-start @[19rem]:gap-1.5 @[19rem]:py-1",
                  i === 0 ? "@[19rem]:pr-3" : "@[19rem]:px-3",
                )}
              >
                <dt className="flex items-center gap-1.5 text-13 font-bold leading-tight text-texto-2">
                  <x.icone aria-hidden className="size-4 shrink-0" />
                  {x.rotulo}
                </dt>
                <dd className="leading-none">{x.valor}</dd>
              </div>
            ))}
          </dl>
          <LinkPorQue onClick={() => setPorQue(true)} className="text-15" />
        </section>

        {usaProducao && (
          <Link
            href="/producao"
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-primaria bg-superficie px-6 text-17 font-bold text-primaria active:bg-primaria-suave"
          >
            <PackagePlus aria-hidden className="size-6" strokeWidth={2.25} /> Lançar produção
          </Link>
        )}

        {recentes.length > 0 && (
          <section aria-labelledby="recentes" className="flex flex-col gap-2 pb-2">
            <h2 id="recentes" className="display text-24">Recentes</h2>
            <ul className="cartao divide-y divide-borda overflow-hidden">
              {recentes.map((x) => (
                <li key={x.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-primaria-forte">
                    <x.icone aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-17 font-bold">{x.titulo}</span>
                    <span className="block text-15 text-texto-2">{x.detalhe}</span>
                  </span>
                  <span className="numeros text-17 font-bold">{x.valor}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <BottomSheet aberto={porQue} onFechar={() => setPorQue(false)} titulo="Por que deu isso?" subtitulo="Conta de hoje, passo a passo">
        <ListaExtrato linhas={extratoDoPeriodo(r).filter((l) => l.tipo !== "titulo")} />
        <BotaoPrincipal variante="fantasma" onClick={() => setPorQue(false)}>Entendi</BotaoPrincipal>
      </BottomSheet>
    </main>
  );
}
