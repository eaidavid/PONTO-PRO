"use client";

import {
  dataPorExtenso,
  type Etapa,
  feriadosDoIntervalo,
  formatarHorasCurto,
  ganhoDoDia,
  lembretesDoDia,
  proximaEtapa,
  saidaPrevista as calcularSaidaPrevista,
  saudacao,
  seloDia,
  somarDias,
  statusDoDia,
} from "@ponto-pro/core";
import {
  BarraProgresso,
  BotaoPonto,
  BotaoPrincipal,
  BottomSheet,
  Chip,
  EtapasDoDia,
  ExplicacaoConta,
  StatusSync,
  useToast,
  ValorDinheiro,
} from "@ponto-pro/ui";
import { BellRing, ChevronRight, HardHat, History, PackagePlus, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { baterPonto, completarMarcacoes, restaurarRegistro, salvarPreferencias } from "../../../lib/acoes";
import { primeiroNome, useAgora, useEstado } from "../../../lib/estado";
import { seloSync, useStatusNuvem } from "../../../lib/nuvem/status";
import { Carregando } from "../../carregando";

const NOME: Record<Etapa, string> = { entrada: "Entrada", almoco: "Almoço", volta: "Volta do almoço", saida: "Saída" };

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

/** Hoje: "o que faço agora?". Relógio no topo, a linha do dia e um botão. Cada informação uma vez. */
export default function Hoje() {
  const estado = useEstado();
  const nuvem = useStatusNuvem();
  const agora = useAgora();
  const online = useOnline();
  const { mostrar } = useToast();
  const [porQue, setPorQue] = useState(false);
  const [escolherObra, setEscolherObra] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string>();
  // proteção contra toque duplo (luva, mão suja)
  const [ultimoToque, setUltimoToque] = useState(0);
  const [confirmar, setConfirmar] = useState(false);

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const { perfil, registros, itens, lancamentos, feriadosLocais } = estado;
    const r = ganhoDoDia({ perfil, data: agora.data, registros, itens, lancamentos, feriadosLocais, agora });
    const feriado = feriadosDoIntervalo(agora.data, agora.data, feriadosLocais).get(agora.data);
    // últimos dias com ponto ou produção, antes de hoje (mais recente primeiro)
    const datas = new Set([...registros.map((x) => x.data), ...lancamentos.map((l) => l.data)]);
    const ultimos = [...datas]
      .filter((d) => d < agora.data)
      .sort()
      .reverse()
      .slice(0, 3)
      .map((data) => {
        const g = ganhoDoDia({ perfil, data, registros, itens, lancamentos, feriadosLocais });
        const reg = registros.find((x) => x.data === data);
        return { data, bruto: g.bruto, trabalhadoMin: g.dias[0]?.trabalhadoMin ?? 0, reg };
      });
    return { r, dia: r.dias[0]!, feriado, ultimos };
  }, [estado, agora]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { perfil, registros, pessoal, preferencias, obrasAtivas } = estado;
  const { r, dia, feriado, ultimos } = calc;
  const registro = registros.find((x) => x.data === agora.data);
  const marcacoes = registro?.marcacoes ?? {};
  const etapa = registro && (registro.tipo === "falta" || registro.tipo === "atestado") ? null : proximaEtapa(marcacoes);
  const previstoMin = dia.escala.trabalha && !dia.feriado ? dia.escala.horasLiquidasMin : 0;
  const saida = calcularSaidaPrevista(dia.escala, marcacoes);
  const status = statusDoDia(dia, marcacoes, agora);
  const nome = primeiroNome(pessoal);
  const usaProducao = perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto";
  const obraAtual = obrasAtivas.find((o) => o.id === (registro?.obraId ?? preferencias.obraAtual));
  const lembretes = lembretesDoDia({ perfil, hoje: registro, ontem: registros.find((x) => x.data === somarDias(agora.data, -1)), agora, feriadoHoje: feriado });

  // pílula do topo: só o estado (as horas ficam na linha do dia)
  const pilula =
    status.estado === "trabalhando" ? "Trabalhando" : status.estado === "encerrado" ? "Dia encerrado" : status.titulo;
  // linha de apoio da linha do dia: horas e saída, uma vez só
  const apoio =
    status.estado === "trabalhando" || status.estado === "encerrado"
      ? [previstoMin ? `${formatarHorasCurto(dia.trabalhadoMin)} de ${formatarHorasCurto(previstoMin)}` : `${formatarHorasCurto(dia.trabalhadoMin)} trabalhadas`, status.estado === "trabalhando" && saida && previstoMin ? `sai às ${saida}` : status.estado === "encerrado" ? status.detalhe.replace(/\.$/, "") : null]
          .filter(Boolean)
          .join(" · ")
      : status.detalhe.replace(/\.$/, "");

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
      const antes = await baterPonto(agora.data, etapa, agora.hora, obraAtual?.id);
      mostrar({
        texto: `${NOME[etapa]} às ${agora.hora}`,
        desfazer: () => {
          setUltimoToque(0);
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

  const linha = "flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2";

  return (
    <main>
      <section className="fundo-marca flex flex-col px-5 pt-[max(16px,env(safe-area-inset-top))] pb-12">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-17 font-bold">{saudacao(agora.minutos)}{nome ? `, ${nome}` : ""}</p>
          <StatusSync estado={seloSync(nuvem, estado.pendentes)} sobreMarca />
        </div>
        <p className="display pt-4 text-relogio" aria-label={`Agora são ${agora.hora}`}>{agora.hora}</p>
        <p className="pt-1 text-17 text-sobre-marca-2 first-letter:uppercase">{dataPorExtenso(agora.data)}</p>
        <div aria-live="polite" className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-white/14 py-2 pr-4 pl-3">
          <span aria-hidden className={status.estado === "trabalhando" ? "size-2.5 rounded-full bg-marca-destaque animate-pulse" : "size-2.5 rounded-full bg-white/70"} />
          <h1 className="text-17 font-bold">{pilula}</h1>
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

        <section aria-label="Linha do dia" className="cartao flex flex-col gap-4 p-4">
          <EtapasDoDia marcacoes={marcacoes} etapaAtual={etapa} />
          {previstoMin > 0 && (
            <BarraProgresso
              valor={dia.trabalhadoMin / previstoMin}
              excedente={Math.max(0, dia.trabalhadoMin - previstoMin) / previstoMin}
              rotulo="Jornada de hoje"
              marcas={Math.round(previstoMin / 60)}
            />
          )}
          {status.estado === "trabalhando" && previstoMin > 0 ? (
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-13 text-texto-2">Trabalhado</dt>
                <dd className="numeros text-20 font-bold">{formatarHorasCurto(dia.trabalhadoMin)}</dd>
              </div>
              <div>
                <dt className="text-13 text-texto-2">{dia.trabalhadoMin >= previstoMin ? "Hora extra" : "Falta"}</dt>
                <dd className={dia.trabalhadoMin >= previstoMin ? "numeros text-20 font-bold text-extra-texto" : "numeros text-20 font-bold"}>
                  {dia.trabalhadoMin >= previstoMin ? `+${formatarHorasCurto(dia.trabalhadoMin - previstoMin)}` : formatarHorasCurto(previstoMin - dia.trabalhadoMin)}
                </dd>
              </div>
              <div>
                <dt className="text-13 text-texto-2">Saída prevista</dt>
                <dd className="numeros text-20 font-bold">{saida ?? "--:--"}</dd>
              </div>
            </dl>
          ) : (
            <p className="numeros text-17 font-bold">{apoio}</p>
          )}
        </section>

        <BotaoPonto
          etapa={etapa}
          hora={agora.hora}
          mostrarHora={false}
          offline={!online}
          carregando={salvando}
          erro={erro}
          aviso={confirmar ? "Você acabou de registrar. Toque de novo para confirmar." : undefined}
          som={preferencias.som}
          onBater={bater}
        />

        <ul className="cartao mb-2 divide-y divide-borda overflow-hidden">
          <li>
            <button type="button" onClick={() => setPorQue(true)} className={linha}>
              <Wallet aria-hidden className="size-5 shrink-0 text-texto-2" />
              <span className="flex-1 text-17 font-bold">Ganho hoje</span>
              <ValorDinheiro centavos={r.bruto} />
              <ChevronRight aria-hidden className="size-5 text-texto-2" />
            </button>
          </li>
          {usaProducao && (
            <li>
              <Link href="/producao" className={linha}>
                <PackagePlus aria-hidden className="size-5 shrink-0 text-texto-2" />
                <span className="flex-1 text-17 font-bold">Lançar produção</span>
                <ChevronRight aria-hidden className="size-5 text-texto-2" />
              </Link>
            </li>
          )}
          {obrasAtivas.length > 0 && (
            <li>
              <button type="button" onClick={() => setEscolherObra(true)} className={linha}>
                <HardHat aria-hidden className="size-5 shrink-0 text-texto-2" />
                <span className="flex-1 text-17 font-bold">Obra</span>
                <span className="text-15 text-texto-2">{obraAtual?.nome ?? "Escolher"}</span>
                <ChevronRight aria-hidden className="size-5 text-texto-2" />
              </button>
            </li>
          )}
        </ul>

        {ultimos.length > 0 && (
          <section aria-labelledby="ultimos-dias" className="mb-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 pl-1">
              <h2 id="ultimos-dias" className="text-15 font-bold text-texto-2">Últimos dias</h2>
              <Link href="/historico" className="inline-flex min-h-12 items-center gap-1 rounded-full px-2 text-15 font-bold text-primaria-forte">
                <History aria-hidden className="size-4" /> Ver tudo
              </Link>
            </div>
            <ul className="cartao divide-y divide-borda overflow-hidden">
              {ultimos.map((u) => {
                const m = u.reg?.marcacoes ?? {};
                const tipo = u.reg && u.reg.tipo !== "normal" ? u.reg.tipo : null;
                const horario = m.entrada ? `${m.entrada} às ${m.saida ?? m.almoco ?? "…"}` : null;
                return (
                  <li key={u.data}>
                    <Link href={`/historico?dia=${u.data}`} className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-superficie-2">
                    <span className="numeros w-14 shrink-0 text-15 font-bold capitalize">{seloDia(u.data)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="numeros block text-17">{tipo ? tipo[0]!.toUpperCase() + tipo.slice(1) : (horario ?? "Só produção")}</span>
                      {u.trabalhadoMin > 0 && <span className="numeros block text-13 text-texto-2">{formatarHorasCurto(u.trabalhadoMin)} trabalhadas</span>}
                    </span>
                    <ValorDinheiro centavos={u.bruto} />
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-texto-2" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <BottomSheet aberto={porQue} onFechar={() => setPorQue(false)} titulo="Por que deu isso?" subtitulo="Conta de hoje, passo a passo">
        <ExplicacaoConta r={r} modo="dia" contexto="Conta de hoje até agora." />
        <BotaoPrincipal variante="fantasma" onClick={() => setPorQue(false)}>Entendi</BotaoPrincipal>
      </BottomSheet>

      <BottomSheet aberto={escolherObra} onFechar={() => setEscolherObra(false)} titulo="Em qual obra você está?" subtitulo="O ponto e a produção de hoje ficam nessa obra.">
        <div className="flex flex-wrap gap-2 pb-4">
          {obrasAtivas.map((o) => (
            <Chip
              key={o.id}
              selecionado={obraAtual?.id === o.id}
              onClick={async () => {
                await salvarPreferencias({ ...preferencias, obraAtual: o.id });
                setEscolherObra(false);
              }}
            >
              {o.nome}
            </Chip>
          ))}
        </div>
      </BottomSheet>
    </main>
  );
}
