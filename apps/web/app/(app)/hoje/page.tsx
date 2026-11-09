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
  lembretesDoDia,
  MODELOS,
  proximaEtapa,
  rotuloUnidade,
  saidaPrevista as calcularSaidaPrevista,
  saudacao,
  somarDias,
  statusDoDia,
  valorProducao,
} from "@ponto-pro/core";
import {
  BarraProgresso,
  BotaoPonto,
  cx,
  BotaoPrincipal,
  BottomSheet,
  EtapasDoDia,
  LinkPorQue,
  ListaExtrato,
  ResumoNumeros,
  StatusSync,
  useToast,
  ValorDinheiro,
} from "@ponto-pro/ui";
import { BellRing, Clock, Hammer, LogIn, LogOut, PackagePlus, Utensils, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { baterPonto, completarMarcacoes, restaurarRegistro } from "../../../lib/acoes";
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
  // proteção contra toque duplo (luva, mão suja): segundo toque em menos de 60s pede confirmação
  const [ultimoToque, setUltimoToque] = useState(0);
  const [confirmar, setConfirmar] = useState(false);

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
  const saidaPrevista = calcularSaidaPrevista(dia.escala, marcacoes);
  const status = statusDoDia(dia, marcacoes, agora);
  const lembretes = lembretesDoDia({
    perfil,
    hoje: registro,
    ontem: registros.find((x) => x.data === somarDias(agora.data, -1)),
    agora,
    feriadoHoje: feriado,
  });
  const nome = primeiroNome(pessoal);
  const usaProducao = perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto";

  async function bater() {
    if (!etapa || !agora) return;
    if (Date.now() - ultimoToque < 60_000 && !confirmar) {
      setConfirmar(true);
      return;
    }
    setConfirmar(false);
    setUltimoToque(Date.now());
    setErro(undefined);
    setSalvando(true);
    try {
      const antes = await baterPonto(agora.data, etapa, agora.hora);
      mostrar({
        texto: `${NOME[etapa]} às ${agora.hora}`,
        desfazer: () => {
          setUltimoToque(0); // depois de desfazer, o próximo toque é intencional
          restaurarRegistro(agora.data, antes);
        },
      });
    } catch {
      setErro("Não deu para salvar. Toque de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function corrigir(l: (typeof lembretes)[number]) {
    const antes = await completarMarcacoes(l.data, l.marcacoes);
    mostrar({ texto: "Ponto corrigido", desfazer: () => restaurarRegistro(l.data, antes) });
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
        <div className="flex items-center gap-3 pt-1">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-white/14 text-17 font-bold">
            {(nome ?? "V")[0]!.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-17 font-bold">{saudacao(agora.minutos)}{nome ? `, ${nome}` : ""}</p>
            <p className="truncate text-13 text-sobre-marca-2">{pessoal.empresa?.trim() || pessoal.cargo?.trim() || MODELOS[perfil.area].nome}</p>
          </div>
          <p className="display text-32" aria-label={`Agora são ${agora.hora}`}>{agora.hora}</p>
        </div>
        <div aria-live="polite" className="pt-5">
          <h1 className="display text-[min(var(--text-44),11vw)] leading-[1.05]">{status.titulo}</h1>
          <p className="pt-1 text-20 text-sobre-marca-2">{status.detalhe}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
          <p className="text-15 text-sobre-marca-2 first-letter:uppercase">{dataPorExtenso(agora.data)}</p>
          <StatusSync estado="local" sobreMarca />
        </div>
      </section>

      <div className="entrada-escalonada relative -mt-8 flex flex-col gap-4 rounded-t-painel bg-fundo px-4 pt-4">
        {lembretes.map((l) => (
          <div key={l.id} role="status" className="cartao flex flex-col gap-3 border-l-4 border-l-[color:var(--extra)]! p-4">
            <p className="flex gap-2 text-17">
              <BellRing aria-hidden className="mt-0.5 size-5 shrink-0 text-extra-texto" />
              {l.texto}
            </p>
            <BotaoPrincipal variante="secundaria" onClick={() => corrigir(l)}>{l.acao}</BotaoPrincipal>
          </div>
        ))}

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

        <BotaoPonto
          etapa={etapa}
          hora={agora.hora}
          offline={!online}
          carregando={salvando}
          erro={erro}
          aviso={confirmar ? "Você acabou de registrar. Toque de novo para confirmar." : undefined}
          som={preferencias.som}
          onBater={bater}
        />

        <ResumoNumeros
          rotulo="Resumo de hoje"
          itens={[
            { rotulo: "Trabalhado", icone: Clock, valor: <span className="display text-24">{formatarDuracao(dia.trabalhadoMin)}</span> },
            { rotulo: marcacoes.saida ? "Saída" : "Saída prevista", icone: LogOut, valor: <span className="display text-24">{saidaPrevista ?? "—"}</span> },
            { rotulo: "Ganho hoje", icone: Wallet, valor: <ValorDinheiro centavos={r.bruto} />, tom: "primaria" },
          ]}
        >
          <LinkPorQue onClick={() => setPorQue(true)} className="text-15" />
        </ResumoNumeros>

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
