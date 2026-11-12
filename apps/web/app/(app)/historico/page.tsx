"use client";

import {
  agruparPorSemana,
  agruparPorSemanaGenerico,
  calcularPeriodo,
  ganhosPorDia,
  categoriasDe,
  completarComEscala,
  csvDoPeriodo,
  diaDaSemana,
  type FiltroDia,
  FILTROS_DIA,
  filtrarDias,
  filtrarLancamentos,
  formatarDuracao,
  formatarQuantidade,
  formatarReais,
  pendenciasDoPeriodo,
  periodoDaData,
  periodoVizinho,
  resumoDoPeriodo,
  rotuloPeriodo,
  rotuloUnidade,
  saldoDoDia,
  seloDia,
  somarDias,
  totaisPorArea,
  valorProducao,
} from "@ponto-pro/core";
import {
  Abas,
  Bloqueio,
  BotaoPrincipal,
  BottomSheet,
  CabecalhoTela,
  Chip,
  EstadoVazio,
  LinhaRegistro,
  TituloSecao,
  useToast,
  ValorDinheiro,
} from "@ponto-pro/ui";
import {
  ChevronDown,
  CalendarDays,
  CircleCheck,
  Download,
  Ellipsis,
  Hammer,
  PackagePlus,
  Search,
  SearchX,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { apagarLancamento, lancarProducao, restaurarVarios, salvarVariosRegistros } from "../../../lib/acoes";
import { useAgora, useEstado, useHistoricoLongo, useLancamentosDoPeriodo, useRegistrosDoPeriodo } from "../../../lib/estado";
import { situacaoAtual } from "../../../lib/plano";
import { Carregando } from "../../carregando";
import { EditorDia } from "../editor-dia";

type Aba = "ponto" | "producao";

function baixar(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob(["﻿" + conteudo], { type: tipo });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Historico() {
  const estado = useEstado();
  const agora = useAgora();
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const { mostrar } = useToast();
  const [periodos, setPeriodos] = useState(false);
  const [filtros, setFiltros] = useState(false);
  const [opcoes, setOpcoes] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);

  // estado da tela fica na URL: Voltar e links mantêm o que a pessoa filtrou
  const aba = (params.get("aba") as Aba) || "ponto";
  const filtro = (params.get("f") as FiltroDia) || "todos";
  const busca = params.get("q") ?? "";
  const obraId = params.get("obra");
  const area = params.get("cat");
  const editar = params.get("editar");
  const ref = params.get("p");
  // O endereço demora um instante para atualizar; guardamos a última versão pedida
  // para que toques seguidos (filtro + busca) não se desfaçam.
  const consulta = useRef(params.toString());
  useEffect(() => {
    consulta.current = params.toString();
  }, [params]);
  const [texto, setTexto] = useState(busca);
  function definir(mudancas: Record<string, string | null>) {
    const sp = new URLSearchParams(consulta.current);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    consulta.current = sp.toString();
    router.replace(`${caminho}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }

  const fech = estado?.perfil?.ciclo.diaFechamento ?? 20;
  const periodo = agora ? periodoDaData(ref ?? agora.data, fech) : null;
  const regs = useRegistrosDoPeriodo(periodo?.inicio ?? "", periodo?.fim ?? "");
  const lancs = useLancamentosDoPeriodo(periodo?.inicio ?? "", periodo?.fim ?? "");
  const desdeLongo = agora ? somarDias(agora.data, -400) : "";
  const longo = useHistoricoLongo(periodos, desdeLongo);

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora || !periodo || !regs) return null;
    const r = calcularPeriodo({ perfil: estado.perfil, periodo, registros: regs, feriadosLocais: estado.feriadosLocais, agora });
    const ateHoje = r.dias.filter((d) => d.data <= agora.data);
    // quanto rendeu cada dia (bruto), como no app antigo
    const fimValores = periodo.fim < agora.data ? periodo.fim : agora.data;
    const valores =
      fimValores >= periodo.inicio
        ? new Map(
            ganhosPorDia({ perfil: estado.perfil, periodo: { inicio: periodo.inicio, fim: fimValores }, registros: regs, lancamentos: lancs ?? [], itens: estado.itens, feriadosLocais: estado.feriadosLocais, agora }).map((g) => [g.data, g.total]),
          )
        : new Map<string, number>();
    return {
      r,
      valores,
      semanas: agruparPorSemana(filtrarDias([...ateHoje].reverse(), { filtro, busca, obraId, registros: regs, obras: estado.obras })),
      pendencias: pendenciasDoPeriodo(r.dias, agora.data),
      completar: completarComEscala(estado.perfil, r.dias, agora.data),
    };
  }, [estado, agora, periodo?.inicio, regs, lancs, filtro, busca, obraId]); // eslint-disable-line react-hooks/exhaustive-deps

  const listaPeriodos = useMemo(() => {
    if (!longo || !estado?.perfil || !agora || !periodo) return null;
    const res = [];
    let p = periodoDaData(agora.data, fech);
    for (let i = 0; i < 12; i++) {
      res.push(resumoDoPeriodo({ perfil: estado.perfil, periodo: p, registros: longo.registros, lancamentos: longo.lancamentos, itens: estado.itens, feriadosLocais: estado.feriadosLocais }));
      p = periodoVizinho(p, -1, fech);
    }
    return res;
  }, [longo, estado, agora, periodo, fech]);

  if (!estado?.perfil || !agora || !periodo || !calc || !regs || !lancs) return <Carregando />;
  const { perfil, itens, obras, obrasAtivas } = estado;
  const plano = situacaoAtual(estado);
  const { r, semanas, pendencias, completar, valores } = calc;
  const atual = agora.data >= periodo.inicio && agora.data <= periodo.fim;
  const porData = new Map(regs.map((x) => [x.data, x]));
  const nomeObra = new Map(obras.map((o) => [o.id, o.nome]));
  const usaProducao = perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto" || lancs.length > 0;
  const porItem = new Map(itens.map((i) => [i.id, i]));
  const lancsFiltrados = filtrarLancamentos(lancs, { itens, busca, area, obraId });
  const totalProducao = lancsFiltrados.reduce((t, l) => t + valorProducao(l.quantidade, l.precoUnitario), 0);
  const filtrando = filtro !== "todos" || !!busca || !!obraId || !!area;
  const buscaVisivel = buscaAberta || !!texto;

  async function completarDias() {
    const antes = await salvarVariosRegistros(completar);
    mostrar({ texto: `${completar.length} ${completar.length === 1 ? "dia preenchido" : "dias preenchidos"} como a escala`, desfazer: () => restaurarVarios(antes) });
  }

  async function apagarLanc(id: string) {
    const antes = await apagarLancamento(id);
    if (antes) mostrar({ texto: "Lançamento apagado", desfazer: () => lancarProducao(antes) });
  }

  function exportar() {
    const csv = csvDoPeriodo(r, regs!, { itens, lancamentos: lancs!, obras });
    baixar(`ponto-pro-${periodo!.inicio}-a-${periodo!.fim}.csv`, csv, "text/csv;charset=utf-8");
    mostrar({ texto: "Planilha do período baixada" });
  }

  return (
    <main className="flex flex-col gap-4 px-4">
      <CabecalhoTela
        titulo="Histórico"
        acao={
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setBuscaAberta(true)}
              aria-expanded={buscaVisivel}
              className="inline-flex min-h-12 flex-col items-center justify-center rounded-2xl px-2 text-13 font-bold text-texto-2 active:bg-superficie-2"
            >
              <Search aria-hidden className="size-5" /> Buscar
            </button>
            <button
              type="button"
              onClick={() => setOpcoes(true)}
              className="inline-flex min-h-12 flex-col items-center justify-center rounded-2xl px-2 text-13 font-bold text-texto-2 active:bg-superficie-2"
            >
              <Ellipsis aria-hidden className="size-5" /> Opções
            </button>
          </div>
        }
      />

      {buscaVisivel && (
        <label className="flex min-h-14 items-center gap-3 rounded-full border-2 border-primaria bg-superficie px-4">
          <Search aria-hidden className="size-5 text-texto-2" />
          <span className="sr-only">Buscar no histórico</span>
          <input
            type="search"
            autoFocus={buscaAberta}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              definir({ q: e.target.value || null });
            }}
            placeholder={aba === "ponto" ? "Dia, nota ou obra" : "Serviço"}
            className="min-w-0 flex-1 bg-transparent text-17 outline-none placeholder:text-texto-2"
          />
          <button
            type="button"
            onClick={() => {
              setTexto("");
              definir({ q: null });
              setBuscaAberta(false);
            }}
            className="-mr-2 flex size-10 items-center justify-center rounded-full text-texto-2"
            aria-label="Fechar busca"
          >
            <X aria-hidden className="size-5" />
          </button>
        </label>
      )}

      {usaProducao && (
        <Abas
          rotulo="O que ver"
          valor={aba}
          onChange={(v) => definir({ aba: v === "ponto" ? null : v, f: null, cat: null })}
          opcoes={[
            { id: "ponto", rotulo: "Ponto" },
            { id: "producao", rotulo: "Produção" },
          ]}
        />
      )}

      {(() => {
        const nomesFiltro = new Map(FILTROS_DIA.map((f) => [f.id, f.rotulo]));
        const ativos: { rotulo: string; limpar: () => void }[] = [];
        if (aba === "ponto" && filtro !== "todos") ativos.push({ rotulo: nomesFiltro.get(filtro) ?? filtro, limpar: () => definir({ f: null }) });
        if (aba === "producao" && area) ativos.push({ rotulo: area, limpar: () => definir({ cat: null }) });
        if (obraId) ativos.push({ rotulo: nomeObra.get(obraId) ?? "Obra", limpar: () => definir({ obra: null }) });
        const pilula = "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-borda-forte bg-superficie px-4 text-15 font-bold active:bg-superficie-2";
        return (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPeriodos(true)} className={pilula} aria-label={`Período ${rotuloPeriodo(periodo)}${atual ? ", atual" : ""}. Trocar período`}>
              <CalendarDays aria-hidden className="size-4" />
              <span className="numeros">{rotuloPeriodo(periodo)}</span>
              <ChevronDown aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={() => setFiltros(true)} className={pilula}>
              <SlidersHorizontal aria-hidden className="size-4" /> Filtrar
              {ativos.length > 0 && <span className="rounded-full bg-primaria px-2 text-13 text-sobre-primaria">{ativos.length}</span>}
            </button>
            {ativos.map((a) => (
              <button
                key={a.rotulo}
                type="button"
                onClick={a.limpar}
                aria-label={`Tirar o filtro ${a.rotulo}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primaria-suave px-4 text-15 font-bold text-primaria-forte"
              >
                {a.rotulo} <X aria-hidden className="size-4" />
              </button>
            ))}
          </div>
        );
      })()}

      {aba === "ponto" && (
        <p className="numeros flex flex-wrap items-center gap-x-1 px-1 text-15 text-texto-2">
          <span>
            <b className="text-texto">{formatarDuracao(r.horas.trabalhadoMin)}</b> trabalhadas
            {r.horas.extraMin > 0 && <> · <b className="text-extra-texto">+{formatarDuracao(r.horas.extraMin)}</b> extra</>}
            {r.horas.deficitMin > 0 && <> · <b className="text-erro-texto">−{formatarDuracao(r.horas.deficitMin)}</b> de falta</>}
          </span>
          {!filtrando && pendencias.length === 0 && (
            <span role="status" className="inline-flex items-center gap-1 font-bold text-sucesso-texto">
              · <CircleCheck aria-hidden className="size-4" /> tudo certo
            </span>
          )}
        </p>
      )}

      {!atual && !plano.pode("historico") ? (
        <Bloqueio
          titulo="Períodos passados"
          texto="Veja e confira todos os períodos que já fecharam, para conversar com quem paga."
          acao={<Link href="/planos" className="inline-flex min-h-12 items-center rounded-full bg-primaria px-5 text-17 font-bold text-sobre-primaria">Ver planos</Link>}
        />
      ) : aba === "ponto" ? (
        <>
          {!filtrando &&
            (pendencias.length === 0 ? null : (
              <section aria-label="Dias que precisam de atenção" className="cartao flex flex-col gap-3 border-l-4 border-l-[color:var(--extra)]! p-4">
                <p className="flex items-center gap-2 text-17 font-bold">
                  <TriangleAlert aria-hidden className="size-5 shrink-0 text-extra-texto" />
                  {pendencias.length === 1 ? "1 dia precisa de atenção" : `${pendencias.length} dias precisam de atenção`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendencias.slice(0, 6).map((p) => (
                    <Chip key={p.data} onClick={() => definir({ editar: p.data })}>{p.texto}</Chip>
                  ))}
                </div>
                {completar.length > 0 && (
                  <BotaoPrincipal variante="secundaria" icone={Wand2} onClick={completarDias}>
                    Completar {completar.length === 1 ? "1 dia" : `${completar.length} dias`} como a escala
                  </BotaoPrincipal>
                )}
              </section>
            ))}

          {semanas.length === 0 ? (
            <EstadoVazio icone={SearchX} frase="Nada encontrado com esse filtro" acao={{ rotulo: "Limpar filtros", onClick: () => { setTexto(""); definir({ f: null, q: null, obra: null }); } }} />
          ) : (
            semanas.map((s) => (
              <section key={s.inicio} aria-label={s.rotulo} className="flex flex-col gap-2">
                <TituloSecao
                  acao={
                    <span className="numeros text-13 font-bold text-texto-2">
                      {(() => {
                        const v = s.itens.reduce((t, d) => t + (valores.get(d.data) ?? 0), 0);
                        return v > 0 ? `${formatarReais(v)} · ` : "";
                      })()}
                      {formatarDuracao(s.trabalhadoMin)}
                      {s.saldoMin !== 0 && (
                        <span className={s.saldoMin > 0 ? "text-extra-texto" : "text-erro-texto"}> · {formatarDuracao(s.saldoMin, { sinal: true })}</span>
                      )}
                    </span>
                  }
                >
                  {s.rotulo}
                </TituloSecao>
                <ul className="cartao divide-y divide-borda overflow-hidden">
                  {s.itens.map((d) => {
                    const reg = porData.get(d.data);
                    return (
                      <li key={d.data}>
                        <LinhaRegistro
                          data={d.data}
                          marcacoes={reg?.marcacoes}
                          tipo={d.tipo}
                          trabalhadoMin={d.trabalhadoMin}
                          saldoMin={saldoDoDia(d)}
                          feriado={d.feriado}
                          hoje={d.data === agora.data}
                          emAndamento={d.emAndamento}
                          fimDeSemana={[0, 6].includes(diaDaSemana(d.data))}
                          folgaDaEscala={!d.registrado && !d.escala.trabalha}
                          nota={reg?.observacao}
                          obra={reg?.obraId ? nomeObra.get(reg.obraId) : undefined}
                          valor={valores.get(d.data)}
                          onClick={() => definir({ editar: d.data })}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      ) : (
        <>
          <p className="numeros px-1 text-15 text-texto-2">
            <b className="text-texto">{formatarReais(totalProducao)}</b> em {lancsFiltrados.length} {lancsFiltrados.length === 1 ? "lançamento" : "lançamentos"}
          </p>
          <Link
            href="/producao"
            className="sombra-botao inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-primaria px-6 text-17 font-bold text-sobre-primaria"
          >
            <PackagePlus aria-hidden className="size-6" /> Lançar produção
          </Link>
          {lancsFiltrados.length === 0 ? (
            <EstadoVazio icone={Hammer} frase={filtrando ? "Nada encontrado com esse filtro" : "Nenhum serviço lançado neste período"} />
          ) : (
            agruparPorSemanaGenerico(lancsFiltrados).map((g) => (
              <section key={g.inicio} aria-label={g.rotulo} className="flex flex-col gap-2">
                <TituloSecao
                  acao={<span className="numeros text-13 font-bold text-texto-2">{formatarReais(g.itens.reduce((t, l) => t + valorProducao(l.quantidade, l.precoUnitario), 0))}</span>}
                >
                  {g.rotulo}
                </TituloSecao>
                <ul className="cartao divide-y divide-borda overflow-hidden">
                  {g.itens.map((l) => {
                    const item = porItem.get(l.itemId);
                    return (
                      <li key={l.id} className="flex min-h-16 items-center gap-3 py-2 pr-1 pl-4">
                        <span className="flex w-11 shrink-0 flex-col items-center">
                          <span className="text-13 font-bold text-texto-2">{seloDia(l.data).split(" ")[0]}</span>
                          <span className="numeros text-20 font-bold leading-none">{l.data.slice(8, 10)}</span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="line-clamp-2 text-17 font-bold leading-snug">{item?.nome ?? "Serviço"}</span>
                          <span className="numeros text-15 text-texto-2">
                            {formatarQuantidade(l.quantidade)} {rotuloUnidade(item?.unidade ?? "un")} × {formatarReais(l.precoUnitario)}
                            {l.obraId && nomeObra.get(l.obraId) ? ` · ${nomeObra.get(l.obraId)}` : ""}
                          </span>
                        </span>
                        <span className="numeros text-17 font-bold">{formatarReais(valorProducao(l.quantidade, l.precoUnitario))}</span>
                        <button
                          type="button"
                          onClick={() => apagarLanc(l.id)}
                          aria-label={`Apagar ${item?.nome ?? "lançamento"} de ${seloDia(l.data)}`}
                          className="flex size-12 shrink-0 items-center justify-center rounded-full text-texto-2 active:bg-erro-suave active:text-erro-texto"
                        >
                          <Trash2 aria-hidden className="size-5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <BottomSheet aberto={opcoes} onFechar={() => setOpcoes(false)} titulo="Opções do histórico">
        <ul className="cartao mb-2 divide-y divide-borda overflow-hidden">
          <li>
            <button
              type="button"
              onClick={() => {
                setOpcoes(false);
                if (plano.pode("exportar")) exportar();
                else setTimeout(() => router.push("/planos"), 120);
              }}
              className="flex min-h-16 w-full items-center gap-3 px-4 text-left active:bg-superficie-2"
            >
              <Download aria-hidden className="size-5 text-primaria-forte" />
              <span className="flex-1">
                <span className="block text-17 font-bold">Baixar planilha do período</span>
                <span className="block text-15 text-texto-2">{plano.pode("exportar") ? "Para mostrar ao patrão ou ao contador" : "Do plano Individual"}</span>
              </span>
            </button>
          </li>
          {completar.length > 0 && (
            <li>
              <button type="button" onClick={() => { setOpcoes(false); completarDias(); }} className="flex min-h-16 w-full items-center gap-3 px-4 text-left active:bg-superficie-2">
                <Wand2 aria-hidden className="size-5 text-primaria-forte" />
                <span className="flex-1">
                  <span className="block text-17 font-bold">Completar {completar.length === 1 ? "1 dia" : `${completar.length} dias`} como a escala</span>
                  <span className="block text-15 text-texto-2">Preenche os dias de trabalho sem registro</span>
                </span>
              </button>
            </li>
          )}
          {!atual && (
            <li>
              <button type="button" onClick={() => { setOpcoes(false); definir({ p: null }); }} className="flex min-h-16 w-full items-center gap-3 px-4 text-left active:bg-superficie-2">
                <CalendarDays aria-hidden className="size-5 text-primaria-forte" />
                <span className="flex-1 text-17 font-bold">Voltar ao período atual</span>
              </button>
            </li>
          )}
        </ul>
      </BottomSheet>

      <BottomSheet
        aberto={filtros}
        onFechar={() => setFiltros(false)}
        titulo="Filtrar"
        rodape={<BotaoPrincipal tamanho="g" onClick={() => setFiltros(false)}>Ver resultados</BotaoPrincipal>}
      >
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex flex-col gap-2">
            <TituloSecao>{aba === "ponto" ? "Mostrar" : "Categoria"}</TituloSecao>
            <div className="flex flex-wrap gap-2">
              {aba === "ponto"
                ? FILTROS_DIA.map((f) => (
                    <Chip key={f.id} selecionado={filtro === f.id} onClick={() => definir({ f: f.id === "todos" ? null : f.id })}>
                      {f.rotulo}
                    </Chip>
                  ))
                : [null, ...categoriasDe(lancs.map((l) => porItem.get(l.itemId)).filter((i) => !!i) as typeof itens)].map((c) => (
                    <Chip key={c ?? "todas"} selecionado={(area ?? null) === c} onClick={() => definir({ cat: c })}>
                      {c ?? "Todas"}
                    </Chip>
                  ))}
            </div>
          </div>
          {obrasAtivas.length > 0 && (
            <div className="flex flex-col gap-2">
              <TituloSecao>Obra</TituloSecao>
              <div className="flex flex-wrap gap-2">
                <Chip selecionado={!obraId} onClick={() => definir({ obra: null })}>Todas</Chip>
                {obrasAtivas.map((o) => (
                  <Chip key={o.id} selecionado={obraId === o.id} onClick={() => definir({ obra: o.id })}>{o.nome}</Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      <EditorDia
        data={editar}
        registro={editar ? (porData.get(editar) ?? null) : null}
        perfil={perfil}
        obras={obrasAtivas}
        onFechar={() => definir({ editar: null })}
      />

      <BottomSheet aberto={periodos} onFechar={() => setPeriodos(false)} titulo="Períodos" subtitulo="Últimos 12 períodos. Toque para abrir.">
        {!listaPeriodos ? (
          <p className="py-6 text-center text-15 text-texto-2">Calculando…</p>
        ) : (
          <ul className="cartao mb-2 divide-y divide-borda overflow-hidden">
            {listaPeriodos.map((p) => (
              <li key={p.inicio}>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodos(false);
                    setTimeout(() => definir({ p: p.inicio === periodoDaData(agora.data, fech).inicio ? null : p.inicio }), 80);
                  }}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2"
                  aria-current={p.inicio === periodo.inicio ? "true" : undefined}
                >
                  <span className="flex-1">
                    <span className="numeros block text-17 font-bold">{rotuloPeriodo(p)}</span>
                    <span className="numeros block text-15 text-texto-2">{p.trabalhadoMin ? `${formatarDuracao(p.trabalhadoMin)} trabalhadas` : "Sem registros"}</span>
                  </span>
                  <span className="numeros text-17 font-bold">{formatarReais(p.liquido)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </main>
  );
}

export default function PaginaHistorico() {
  return (
    <Suspense fallback={<Carregando />}>
      <Historico />
    </Suspense>
  );
}
