"use client";

import {
  calcularPrevisao,
  formatarReais,
  formatarReaisCurto,
  type OpcaoMeta,
  PASSO_META,
  periodoDaData,
  rotuloPeriodo,
  rotuloUnidade,
  simularMeta,
  valorProducao,
} from "@ponto-pro/core";
import { Banner, Bloqueio, BottomSheet, CabecalhoTela, Chip, Contador, TituloSecao } from "@ponto-pro/ui";
import { CalendarDays, Clock, Hammer, Moon, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useAgora, useEstado } from "../../../lib/estado";
import Link from "next/link";
import { situacaoAtual } from "../../../lib/plano";
import { Carregando } from "../../carregando";

const ICONES: Record<OpcaoMeta["tipo"], LucideIcon> = {
  "horas-extras": Clock,
  sabados: CalendarDays,
  folgas: Moon,
  producao: Hammer,
};

export default function Metas() {
  const estado = useEstado();
  const agora = useAgora();
  const [alvo, setAlvo] = useState<number | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [trocar, setTrocar] = useState(false);

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const { perfil, registros, itens, lancamentos } = estado;
    const periodo = periodoDaData(agora.data, perfil.ciclo.diaFechamento);
    const previsao = calcularPrevisao({ perfil, periodo, registros, itens, lancamentos, feriadosLocais: estado.feriadosLocais, agora, hoje: agora.data });
    // serviços mais lançados primeiro
    const uso = new Map<string, number>();
    for (const l of lancamentos) uso.set(l.itemId, (uso.get(l.itemId) ?? 0) + valorProducao(l.quantidade, l.precoUnitario));
    const favoritos = [...itens].sort((a, b) => (uso.get(b.id) ?? 0) - (uso.get(a.id) ?? 0)).slice(0, 6);
    return { periodo, previsto: previsao.previsto.liquido, favoritos };
  }, [estado, agora]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { perfil } = estado;
  const { periodo, previsto, favoritos } = calc;
  const usaProducao = perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto";
  const sugerido = Math.ceil((previsto + 50_000) / 10_000) * 10_000;
  const meta = alvo ?? sugerido;
  const item = usaProducao ? (favoritos.find((i) => i.id === itemId) ?? favoritos[0]) : undefined;
  const r = simularMeta({ perfil, alvo: meta, previsto, item });

  if (!situacaoAtual(estado).pode("metas")) {
    return (
      <main className="flex flex-col gap-4 px-4">
        <CabecalhoTela titulo="Metas" />
        <Bloqueio
          titulo="Quanto quero receber?"
          texto="Diga quanto quer ganhar no período e veja quantas horas extras, sábados ou serviços faltam."
          acao={<Link href="/planos" className="inline-flex min-h-12 items-center rounded-full bg-primaria px-5 text-17 font-bold text-sobre-primaria">Ver planos</Link>}
        />
      </main>
    );
  }
  return (
    <main className="flex flex-col gap-4 px-4">
      <CabecalhoTela titulo="Metas" subtitulo={`Período ${rotuloPeriodo(periodo)}`} />

      <section className="cartao flex flex-col gap-2 p-5">
        <Contador
          rotulo="Quanto quero receber neste período?"
          valor={formatarReaisCurto(meta)}
          passo={formatarReaisCurto(PASSO_META)}
          grande
          onMenos={() => setAlvo(Math.max(PASSO_META, meta - PASSO_META))}
          onMais={() => setAlvo(meta + PASSO_META)}
          podeMenos={meta > PASSO_META}
        />
        <div className="flex flex-col gap-1.5 pt-2">
          <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-superficie-2">
            <span className={previsto >= meta ? "block h-full rounded-full bg-sucesso" : "block h-full rounded-full bg-primaria"} style={{ width: `${Math.min(100, Math.round((previsto / Math.max(1, meta)) * 100))}%` }} />
          </span>
          <p className="numeros flex justify-between gap-3 text-15 text-texto-2">
            <span>Pela sua escala: <b className="text-texto">{formatarReais(previsto)}</b></span>
            <span className="font-bold">{Math.min(100, Math.round((previsto / Math.max(1, meta)) * 100))}%</span>
          </p>
        </div>
      </section>

      <p aria-live="polite" className="px-1 text-20 font-bold leading-snug">{r.frase}</p>

      {r.observacao && <Banner tom="info" texto={r.observacao} />}

      {r.opcoes.length > 0 && (
        <section aria-labelledby="opcoes" className="flex flex-col gap-2 pb-2">
          <TituloSecao id="opcoes">Jeitos de chegar lá</TituloSecao>
          <ul className="cartao divide-y divide-borda overflow-hidden">
            {r.opcoes.map((o) => {
              const Icone = ICONES[o.tipo];
              return (
                <li key={o.tipo} className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <Icone aria-hidden className="size-5 shrink-0 text-extra-texto" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-17 font-bold first-letter:uppercase">{o.texto}</span>
                    <span className="numeros block text-15 text-texto-2">
                      cada {o.tipo === "producao" && item ? rotuloUnidade(item.unidade) : o.tipo === "horas-extras" ? "hora" : o.tipo === "sabados" ? "sábado" : "folga"} rende {formatarReais(o.valorCada)}
                    </span>
                  </span>
                  {o.tipo === "producao" && favoritos.length > 1 && (
                    <button type="button" onClick={() => setTrocar(true)} className="min-h-12 shrink-0 rounded-full px-3 text-15 font-bold text-primaria-forte underline underline-offset-4">
                      Trocar serviço
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="px-1 text-13 text-texto-2">Valores antes dos descontos. A conta já considera os descontos que você cadastrou.</p>
        </section>
      )}

      <BottomSheet aberto={trocar} onFechar={() => setTrocar(false)} titulo="Com qual serviço?">
        <div className="flex flex-wrap gap-2 pb-4">
          {favoritos.map((i) => (
            <Chip
              key={i.id}
              selecionado={item?.id === i.id}
              onClick={() => {
                setItemId(i.id);
                setTrocar(false);
              }}
            >
              {i.nome}
            </Chip>
          ))}
        </div>
      </BottomSheet>
    </main>
  );
}
