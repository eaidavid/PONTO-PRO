"use client";

import {
  calcularPeriodo,
  dataPorExtenso,
  formatarDuracao,
  formatarQuantidade,
  formatarReais,
  type PerfilTrabalho,
  rotuloUnidade,
  valorProducao,
} from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, cx, ExplicacaoConta, ValorDinheiro } from "@ponto-pro/ui";
import { Clock, HardHat, History, LogIn, LogOut, NotebookPen, PackagePlus, Pencil, Trash2, Utensils, Hammer } from "lucide-react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { apagarLancamento, lancarProducao } from "../../lib/acoes";
import type { LancamentoProducao } from "@ponto-pro/core";
import { db } from "../../lib/db";
import type { Estado } from "../../lib/estado";
import { EditarLancamento } from "./editar-lancamento";
import { alteracoesDaProducao, alteracoesDoDia, linhaDoTempo, type VersaoSalva } from "../../lib/historico-dia";

const ICONE = { entrada: LogIn, almoco: Utensils, volta: Hammer, saida: LogOut } as const;
const NOME_TIPO = { normal: "", falta: "Falta", atestado: "Atestado", feriado: "Feriado", folga: "Folga", compensado: "Compensado" } as const;

export interface ResumoDiaProps {
  data: string | null;
  estado: Estado & { perfil: PerfilTrabalho };
  onFechar: () => void;
  /** Abre o editor do dia (horários, tipo, obra e nota). */
  onAjustar: (data: string, focoNota?: boolean) => void;
}

/**
 * O dia inteiro numa tela: quanto rendeu, o que foi feito (horários, intervalos e produção),
 * a conta, as alterações feitas depois e os botões para ajustar.
 */
export function ResumoDia({ data, estado, onFechar, onAjustar }: ResumoDiaProps) {
  // o painel aberto bloqueia o resto da tela: o "Desfazer" fica dentro dele
  const [apagado, setApagado] = useState<LancamentoProducao | null>(null);
  const [editLanc, setEditLanc] = useState<LancamentoProducao | null>(null);
  useEffect(() => setApagado(null), [data]);
  const { perfil, itens, feriadosLocais, obras } = estado;

  // lê do banco direto: o estado do app só carrega os últimos períodos
  const dados = useLiveQuery(async () => {
    if (!data) return null;
    const registro = (await db.registros.get(data)) ?? null;
    const lancamentos = await db.lancamentos.where("data").equals(data).toArray();
    const versoesDia = (await db.historico.where("[tabela+chave]").equals(["registros", data]).toArray()) as VersaoSalva[];
    const versoesLanc = new Map<string, VersaoSalva[]>();
    for (const l of lancamentos) versoesLanc.set(l.id, (await db.historico.where("[tabela+chave]").equals(["lancamentos", l.id]).toArray()) as VersaoSalva[]);
    return { registro, lancamentos, versoesDia, versoesLanc };
  }, [data]);

  const aberto = !!data && !!dados;
  const registro = dados?.registro ?? null;
  const lancamentos = dados?.lancamentos ?? [];
  const r = data && dados ? calcularPeriodo({ perfil, periodo: { inicio: data, fim: data }, registros: registro ? [registro] : [], lancamentos, itens, feriadosLocais, modo: "dia" }) : null;
  const d = r?.dias[0];
  const porId = new Map(itens.map((i) => [i.id, i]));
  const nomeObra = (id?: string) => obras.find((o) => o.id === id)?.nome;
  const passos = registro ? linhaDoTempo(registro.marcacoes) : [];
  const alteracoes =
    dados && data
      ? [...alteracoesDoDia(dados.versoesDia, registro, nomeObra), ...alteracoesDaProducao(lancamentos, dados.versoesLanc, itens)].sort((a, b) => b.em.localeCompare(a.em))
      : [];
  const usaProducao = perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto" || lancamentos.length > 0;
  const tipo = registro?.tipo ?? "normal";
  const etiqueta = d?.feriado ?? (NOME_TIPO[tipo] || (!d?.escala.trabalha && !registro ? "Folga pela escala" : ""));

  async function apagar(id: string) {
    const antes = await apagarLancamento(id);
    if (antes) setApagado(antes);
  }

  const secao = "flex flex-col gap-2";
  const tituloSecao = "text-15 font-bold text-texto-2";

  return (
    <>
    <BottomSheet
      aberto={aberto && !editLanc}
      onFechar={onFechar}
      titulo={data ? dataPorExtenso(data).replace(/^./, (c) => c.toUpperCase()) : ""}
      subtitulo={[etiqueta, registro?.obraId ? nomeObra(registro.obraId) : null].filter(Boolean).join(" · ") || undefined}
      rodape={
        data && (
          <div className={cx("grid gap-3", usaProducao ? "grid-cols-2" : "grid-cols-1")}>
            <BotaoPrincipal icone={Pencil} onClick={() => onAjustar(data)} aria-label="Ajustar o dia">Ajustar</BotaoPrincipal>
            {usaProducao && (
              <Link
                href={`/producao?dia=${data}`}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-primaria bg-superficie px-4 text-17 font-bold text-primaria"
              >
                <PackagePlus aria-hidden className="size-5 shrink-0" /> Produção
              </Link>
            )}
          </div>
        )
      }
    >
      {aberto && r && d && data && (
        <div className="flex flex-col gap-6 pb-2">
          {/* quanto rendeu */}
          <section aria-label="Quanto o dia rendeu" className="fundo-marca flex flex-col gap-1 rounded-[20px] p-4">
            <span className="text-15 font-bold text-sobre-marca-2">O dia rendeu</span>
            <ValorDinheiro centavos={r.bruto} tamanho="g" />
            <span className="numeros text-15 text-sobre-marca-2">
              {d.trabalhadoMin > 0 ? `${formatarDuracao(d.trabalhadoMin)} trabalhadas` : tipo === "falta" ? "Dia de falta" : "Sem horas registradas"}
              {r.horas.extraMin > 0 ? ` · ${formatarDuracao(r.horas.extraMin)} de hora extra` : ""}
              {r.horas.deficitMin > 0 && tipo !== "falta" ? ` · faltaram ${formatarDuracao(r.horas.deficitMin)}` : ""}
            </span>
          </section>

          {/* o que fez */}
          <section aria-labelledby="t-fez" className={secao}>
            <h3 id="t-fez" className={tituloSecao}>O que você fez</h3>
            {passos.length === 0 && lancamentos.length === 0 && !registro?.observacao ? (
              <p className="rounded-2xl bg-superficie-2 p-4 text-17 text-texto-2">
                {tipo !== "normal" ? `Dia marcado como ${NOME_TIPO[tipo].toLowerCase()}.` : "Nada registrado neste dia."}
              </p>
            ) : (
              <ol className="cartao flex flex-col px-4 py-2">
                {passos.map((p, i) =>
                  p.tipo === "marcacao" ? (
                    <li key={i} className="flex min-h-12 items-center gap-3">
                      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-primaria-forte">
                        {(() => {
                          const I = ICONE[p.etapa];
                          return <I className="size-5" strokeWidth={2.25} />;
                        })()}
                      </span>
                      <span className="flex-1 text-17">{p.texto}</span>
                      <span className="numeros text-20 font-bold">{p.hora}</span>
                    </li>
                  ) : (
                    <li key={i} className="flex items-center gap-3 py-0.5">
                      <span aria-hidden className="flex w-9 shrink-0 justify-center">
                        <span className={cx("h-6 w-0.5 rounded-full", p.almoco ? "bg-borda-forte" : "bg-primaria")} />
                      </span>
                      <span className={cx("numeros text-15", p.almoco ? "text-texto-2" : "font-bold text-primaria-forte")}>{p.texto}</span>
                    </li>
                  ),
                )}
                {lancamentos.map((l) => {
                  const item = porId.get(l.itemId);
                  return (
                    <li key={l.id} className="flex items-start gap-3 border-t border-borda py-2 first:border-t-0">
                      <span aria-hidden className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-extra-suave text-extra-texto">
                        <PackagePlus className="size-5" strokeWidth={2.25} />
                      </span>
                      <button type="button" onClick={() => setEditLanc(l)} aria-label={`Editar ${item?.nome ?? "lançamento"}`} className="flex min-w-0 flex-1 flex-col rounded-xl pt-1 text-left active:bg-superficie-2">
                        <span className="text-17 font-bold">{item?.nome ?? "Serviço"}</span>
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="numeros text-15 whitespace-nowrap text-texto-2">
                            {formatarQuantidade(l.quantidade)} {item ? rotuloUnidade(item.unidade) : ""} × {formatarReais(l.precoUnitario)}
                          </span>
                          <span className="numeros text-17 font-bold whitespace-nowrap">{formatarReais(valorProducao(l.quantidade, l.precoUnitario))}</span>
                        </span>
                        {l.descricao ? (
                          <span className="text-15 text-texto">{l.descricao}</span>
                        ) : (
                          <span className="text-13 font-bold text-primaria-forte">+ observação</span>
                        )}
                      </button>
                      <button type="button" onClick={() => apagar(l.id)} aria-label={`Apagar ${item?.nome ?? "lançamento"}`} className="-mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-texto-2 active:bg-superficie-2">
                        <Trash2 aria-hidden className="size-5" />
                      </button>
                    </li>
                  );
                })}
                {registro?.obraId && (
                  <li className="flex min-h-12 items-center gap-3 border-t border-borda">
                    <HardHat aria-hidden className="size-5 shrink-0 text-texto-2" />
                    <span className="text-17">Obra: <b>{nomeObra(registro.obraId)}</b></span>
                  </li>
                )}
              </ol>
            )}
            {apagado && (
              <div role="status" className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-texto px-4 text-fundo">
                <span className="text-15 font-bold">Lançamento apagado</span>
                <button
                  type="button"
                  onClick={async () => {
                    await lancarProducao(apagado);
                    setApagado(null);
                  }}
                  className="inline-flex min-h-12 items-center rounded-full px-3 text-17 font-bold underline underline-offset-4"
                >
                  Desfazer
                </button>
              </div>
            )}
            {registro?.observacao ? (
              <button type="button" onClick={() => onAjustar(data, true)} className="flex items-start gap-3 rounded-2xl bg-superficie-2 p-4 text-left">
                <NotebookPen aria-hidden className="mt-0.5 size-5 shrink-0 text-texto-2" />
                <span className="text-17">{registro.observacao}</span>
              </button>
            ) : (
              <button type="button" onClick={() => onAjustar(data, true)} className="inline-flex min-h-12 items-center gap-2 self-start rounded-full px-2 text-15 font-bold text-primaria-forte">
                <NotebookPen aria-hidden className="size-4" /> Escrever uma nota do dia
              </button>
            )}
          </section>

          {/* conta */}
          {r.ganhos.length > 0 && (
            <section aria-labelledby="t-conta" className={secao}>
              <h3 id="t-conta" className={tituloSecao}>Como chegou nesse valor</h3>
              <ExplicacaoConta r={r} modo="dia" />
            </section>
          )}

          {/* alterações */}
          {alteracoes.length > 0 && (
            <details className="group rounded-2xl bg-superficie-2">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 text-17 font-bold [&::-webkit-details-marker]:hidden">
                <History aria-hidden className="size-5 text-texto-2" />
                <span className="flex-1">Alterações ({alteracoes.length})</span>
                <span className="text-15 font-normal text-texto-2 group-open:hidden">ver</span>
              </summary>
              <ol className="flex flex-col gap-3 px-4 pb-4">
                {alteracoes.map((a, i) => (
                  <li key={a.em + i} className="flex gap-3">
                    <Clock aria-hidden className="mt-1 size-4 shrink-0 text-texto-2" />
                    <span className="flex flex-col">
                      <span className="numeros text-13 font-bold text-texto-2">{a.quando}</span>
                      {a.mudancas.map((m) => (
                        <span key={m} className="numeros text-15">{m}</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </BottomSheet>
    <EditarLancamento lancamento={editLanc} item={editLanc ? porId.get(editLanc.itemId) : undefined} onFechar={() => setEditLanc(null)} comDesfazer={false} />
    </>
  );
}
