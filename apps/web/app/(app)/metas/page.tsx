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
import { Banner, CabecalhoTela, Chip, Contador } from "@ponto-pro/ui";
import { CalendarDays, Clock, Hammer, Moon, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useAgora, useEstado } from "../../../lib/estado";
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

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const { perfil, registros, itens, lancamentos } = estado;
    const periodo = periodoDaData(agora.data, perfil.ciclo.diaFechamento);
    const previsao = calcularPrevisao({ perfil, periodo, registros, itens, lancamentos, agora, hoje: agora.data });
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
        <p className="pt-2 text-center text-15 text-texto-2">Pela sua escala, você deve receber {formatarReais(previsto)}.</p>
      </section>

      <section aria-live="polite" className="fundo-marca rounded-[24px] p-5">
        <p className="display text-32 leading-tight">{r.frase}</p>
      </section>

      {r.observacao && <Banner tom="info" texto={r.observacao} />}

      {usaProducao && favoritos.length > 0 && r.faltaLiquido > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-17 font-bold">Com qual serviço?</h2>
          <div role="group" aria-label="Serviço para a meta" className="flex flex-wrap gap-2">
            {favoritos.map((i) => (
              <Chip key={i.id} selecionado={item?.id === i.id} onClick={() => setItemId(i.id)}>
                {i.nome}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {r.opcoes.length > 0 && (
        <section aria-labelledby="opcoes" className="flex flex-col gap-2 pb-2">
          <h2 id="opcoes" className="display text-24">Jeitos de chegar lá</h2>
          <ul className="flex flex-col gap-3">
            {r.opcoes.map((o) => {
              const Icone = ICONES[o.tipo];
              return (
                <li key={o.tipo} className="cartao flex items-center gap-4 p-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-extra-suave text-extra-texto">
                    <Icone aria-hidden className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-20 font-bold first-letter:uppercase">{o.texto}</span>
                    <span className="numeros block text-15 text-texto-2">
                      cada {o.tipo === "producao" && item ? rotuloUnidade(item.unidade) : o.tipo === "horas-extras" ? "hora" : o.tipo === "sabados" ? "sábado" : "folga"} rende {formatarReais(o.valorCada)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-13 text-texto-2">Valores antes dos descontos. A conta já considera os descontos que você cadastrou.</p>
        </section>
      )}
    </main>
  );
}
