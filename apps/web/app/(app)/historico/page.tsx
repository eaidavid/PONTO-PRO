"use client";

import {
  agruparPorSemana,
  agruparPorSemanaGenerico,
  calcularPeriodo,
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
  BotaoPrincipal,
  BottomSheet,
  CabecalhoTela,
  Chip,
  EstadoVazio,
  LinhaRegistro,
  ResumoNumeros,
  TituloSecao,
  useToast,
  ValorDinheiro,
} from "@ponto-pro/ui";
import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  Hammer,
  PackagePlus,
  Search,
  SearchX,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { apagarLancamento, lancarProducao, restaurarVarios, salvarVariosRegistros } from "../../../lib/acoes";
import { useAgora, useEstado, useHistoricoLongo, useLancamentosDoPeriodo, useRegistrosDoPeriodo } from "../../../lib/estado";
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
    return {
      r,
      semanas: agruparPorSemana(filtrarDias([...ateHoje].reverse(), { filtro, busca, obraId, registros: regs, obras: estado.obras })),
      pendencias: pendenciasDoPeriodo(r.dias, agora.data),
      completar: completarComEscala(estado.perfil, r.dias, agora.data),
    };
  }, [estado, agora, periodo?.inicio, regs, filtro, busca, obraId]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const { r, semanas, pendencias, completar } = calc;
  const atual = agora.data >= periodo.inicio && agora.data <= periodo.fim;
  const porData = new Map(regs.map((x) => [x.data, x]));
  const nomeObra = new Map(obras.map((o) => [o.id, o.nome]));
  const usaProducao = perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto" || lancs.length > 0;
  const porItem = new Map(itens.map((i) => [i.id, i]));
  const lancsFiltrados = filtrarLancamentos(lancs, { itens, busca, area, obraId });
  const totalProducao = lancsFiltrados.reduce((t, l) => t + valorProducao(l.quantidade, l.precoUnitario), 0);
  const filtrando = filtro !== "todos" || !!busca || !!obraId || !!area;

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
          <button type="button" onClick={exportar} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 text-15 font-bold text-primaria-forte active:bg-primaria-suave">
            <Download aria-hidden className="size-5" /> Exportar
          </button>
        }
      />

      <label className="flex min-h-14 items-center gap-3 rounded-full border-2 border-borda-forte bg-superficie px-4 focus-within:border-primaria">
        <Search aria-hidden className="size-5 text-texto-2" />
        <span className="sr-only">Buscar no histórico</span>
        <input
          type="search"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            definir({ q: e.target.value || null });
          }}
          placeholder={aba === "ponto" ? "Buscar dia, nota ou obra" : "Buscar serviço"}
          className="min-w-0 flex-1 bg-transparent text-17 outline-none placeholder:text-texto-2"
        />
        {texto && (
          <button type="button" onClick={() => { setTexto(""); definir({ q: null }); }} className="-mr-2 flex size-10 items-center justify-center rounded-full text-texto-2" aria-label="Limpar busca">
            <X aria-hidden className="size-5" />
          </button>
        )}
      </label>

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

      <nav aria-label="Período" className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => definir({ p: periodoVizinho(periodo, -1, fech).inicio })}
          aria-label="Período anterior"
          className="flex size-12 items-center justify-center rounded-full active:bg-superficie-2"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <button type="button" onClick={() => setPeriodos(true)} className="flex min-h-12 flex-1 flex-col items-center justify-center rounded-2xl active:bg-superficie-2">
          <span className="numeros inline-flex items-center gap-1 text-17 font-bold">
            {rotuloPeriodo(periodo)} <ChevronDown aria-hidden className="size-4" />
          </span>
          <span className="text-13 text-texto-2">{atual ? "Período atual" : "Toque para ver outros períodos"}</span>
        </button>
        <button
          type="button"
          disabled={atual}
          onClick={() => definir({ p: periodoVizinho(periodo, 1, fech).inicio })}
          aria-label="Próximo período"
          className="flex size-12 items-center justify-center rounded-full active:bg-superficie-2 disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </nav>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtros">
        {aba === "ponto"
          ? FILTROS_DIA.map((f) => (
              <Chip key={f.id} className="shrink-0" selecionado={filtro === f.id} onClick={() => definir({ f: f.id === "todos" ? null : f.id })}>
                {f.rotulo}
              </Chip>
            ))
          : [null, ...categoriasDe(lancs.map((l) => porItem.get(l.itemId)).filter((i) => !!i) as typeof itens)].map((c) => (
              <Chip key={c ?? "todas"} className="shrink-0" selecionado={(area ?? null) === c} onClick={() => definir({ cat: c })}>
                {c ?? "Todas"}
              </Chip>
            ))}
      </div>

      {obrasAtivas.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Obra">
          <Chip className="shrink-0" selecionado={!obraId} onClick={() => definir({ obra: null })}>Todas as obras</Chip>
          {obrasAtivas.map((o) => (
            <Chip key={o.id} className="shrink-0" selecionado={obraId === o.id} onClick={() => definir({ obra: o.id })}>{o.nome}</Chip>
          ))}
        </div>
      )}

      {aba === "ponto" ? (
        <>
          {!filtrando &&
            (pendencias.length === 0 ? (
              <p role="status" className="flex items-center gap-2 px-1 text-15 font-bold text-sucesso-texto">
                <CircleCheck aria-hidden className="size-5" /> Tudo certo neste período.
              </p>
            ) : (
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

          <ResumoNumeros
            rotulo="Resumo do período"
            itens={[
              { rotulo: "Trabalhado", icone: Clock, valor: <span className="display text-24">{formatarDuracao(r.horas.trabalhadoMin)}</span> },
              { rotulo: "Hora extra", icone: TrendingUp, valor: <span className="display text-24">{r.horas.extraMin ? `+${formatarDuracao(r.horas.extraMin)}` : "0h"}</span>, tom: r.horas.extraMin ? "extra" : "normal" },
              { rotulo: "Faltas e atrasos", icone: TrendingDown, valor: <span className="display text-24">{r.horas.deficitMin ? `−${formatarDuracao(r.horas.deficitMin)}` : "0h"}</span>, tom: r.horas.deficitMin ? "erro" : "normal" },
            ]}
          />

          {semanas.length === 0 ? (
            <EstadoVazio icone={SearchX} frase="Nada encontrado com esse filtro" acao={{ rotulo: "Limpar filtros", onClick: () => { setTexto(""); definir({ f: null, q: null, obra: null }); } }} />
          ) : (
            semanas.map((s) => (
              <section key={s.inicio} aria-label={s.rotulo} className="flex flex-col gap-2">
                <TituloSecao
                  acao={
                    <span className="numeros text-13 font-bold text-texto-2">
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
                          nota={reg?.observacao}
                          obra={reg?.obraId ? nomeObra.get(reg.obraId) : undefined}
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
          <ResumoNumeros
            rotulo="Produção do período"
            itens={[
              { rotulo: "Total", icone: Hammer, valor: <ValorDinheiro centavos={totalProducao} />, tom: "primaria" },
              { rotulo: "Lançamentos", icone: PackagePlus, valor: <span className="display text-24">{lancsFiltrados.length}</span> },
              { rotulo: "Áreas", icone: CalendarRange, valor: <span className="display text-24">{totaisPorArea(itens, lancsFiltrados).length}</span> },
            ]}
          />
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
