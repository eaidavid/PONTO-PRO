"use client";

import {
  buscarItens,
  formatarQuantidade,
  formatarReais,
  type ItemProducao,
  lerReais,
  periodoDaData,
  rotuloPeriodo,
  rotuloUnidade,
  seloDia,
  somarDias,
  totaisPorArea,
  valorProducao,
} from "@ponto-pro/core";
import {
  BotaoPrincipal,
  BottomSheet,
  BuscaServico,
  CabecalhoTela,
  CampoNumero,
  Chip,
  EstadoVazio,
  SeloSugestao,
  useToast,
  ValorDinheiro,
} from "@ponto-pro/ui";
import { Hammer, Save, Search, Tags, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { apagarLancamento, lancarProducao, novoId, removerItem, salvarItem } from "../../../lib/acoes";
import { useAgora, useEstado } from "../../../lib/estado";
import { AbasRegistro } from "../abas-registro";
import { Carregando } from "../../carregando";

export default function Producao() {
  const estado = useEstado();
  const agora = useAgora();
  const { mostrar } = useToast();
  const [chave, setChave] = useState(0);
  const [quando, setQuando] = useState<"hoje" | "ontem">("hoje");
  const [precos, setPrecos] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [editandoItem, setEditandoItem] = useState<ItemProducao | null>(null);
  const [precoTxt, setPrecoTxt] = useState("");

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const periodo = periodoDaData(agora.data, estado.perfil.ciclo.diaFechamento);
    const doPeriodo = estado.lancamentos.filter((l) => l.data >= periodo.inicio && l.data <= periodo.fim);
    const total = doPeriodo.reduce((t, l) => t + valorProducao(l.quantidade, l.precoUnitario), 0);
    return { periodo, doPeriodo, total, areas: totaisPorArea(estado.itens, doPeriodo) };
  }, [estado, agora]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { itens } = estado;
  const { periodo, doPeriodo, total, areas } = calc;
  const porId = new Map(itens.map((i) => [i.id, i]));
  const data = quando === "hoje" ? agora.data : somarDias(agora.data, -1);

  async function lancar({ item, novo, quantidade }: { item: ItemProducao; novo: boolean; quantidade: number }) {
    if (novo) await salvarItem(item);
    const id = novoId("l");
    await lancarProducao({ id, data, itemId: item.id, quantidade, precoUnitario: item.preco });
    setChave((k) => k + 1);
    mostrar({
      texto: `${novo ? "Serviço criado. " : ""}${formatarQuantidade(quantidade)} ${rotuloUnidade(item.unidade)} lançados`,
      desfazer: () => apagarLancamento(id),
    });
  }

  async function apagar(id: string) {
    const antes = await apagarLancamento(id);
    if (antes) mostrar({ texto: "Lançamento apagado", desfazer: () => lancarProducao(antes) });
  }

  async function salvarPreco() {
    if (!editandoItem) return;
    const preco = lerReais(precoTxt);
    if (preco === null) return;
    await salvarItem({ ...editandoItem, preco, exemplo: false });
    setEditandoItem(null);
    mostrar({ texto: `Preço de ${editandoItem.nome} salvo` });
  }

  const listaPrecos = buscarItens(itens, filtro, 200).itens;

  return (
    <main className="flex flex-col gap-4 px-4">
      <CabecalhoTela
        titulo="Registros"
        subtitulo={`Período ${rotuloPeriodo(periodo)}`}
        acao={
          <button type="button" onClick={() => setPrecos(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 text-15 font-bold text-primaria-forte active:bg-primaria-suave">
            <Tags aria-hidden className="size-5" /> Preços
          </button>
        }
      />

      <AbasRegistro ativa="producao" />

      <section aria-label="Total do período" className="fundo-marca flex flex-col gap-1 rounded-[24px] p-5">
        <span className="text-15 font-bold text-sobre-marca-2">Produção no período</span>
        <ValorDinheiro centavos={total} tamanho="gg" />
        <span className="text-15 text-sobre-marca-2">
          {doPeriodo.length} {doPeriodo.length === 1 ? "lançamento" : "lançamentos"}
        </span>
      </section>

      <section aria-labelledby="lancar" className="cartao flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="lancar" className="display text-24">Lançar serviço</h2>
          <div role="group" aria-label="Dia do serviço" className="flex gap-2">
            <Chip selecionado={quando === "hoje"} onClick={() => setQuando("hoje")}>Hoje</Chip>
            <Chip selecionado={quando === "ontem"} onClick={() => setQuando("ontem")}>Ontem</Chip>
          </div>
        </div>
        <BuscaServico key={chave} itens={itens} onLancar={lancar} />
      </section>

      <section aria-labelledby="lista" className="flex flex-col gap-2">
        <h2 id="lista" className="display text-24">No período</h2>
        {doPeriodo.length === 0 ? (
          <EstadoVazio icone={Hammer} frase="Nenhum serviço lançado ainda" />
        ) : (
          <ul className="cartao divide-y divide-borda overflow-hidden">
            {doPeriodo.map((l) => {
              const item = porId.get(l.itemId);
              return (
                <li key={l.id} className="flex min-h-16 items-center gap-3 py-2 pr-2 pl-4">
                  <span className="flex w-11 shrink-0 flex-col items-center text-center">
                    <span className="text-13 font-bold text-texto-2">{seloDia(l.data).split(" ")[0]}</span>
                    <span className="display text-20 leading-none">{l.data.slice(8, 10)}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="line-clamp-2 text-17 font-bold leading-snug">{item?.nome ?? "Serviço"}</span>
                    <span className="numeros text-15 text-texto-2">
                      {formatarQuantidade(l.quantidade)} {rotuloUnidade(item?.unidade ?? "un")} × {formatarReais(l.precoUnitario)}
                    </span>
                    <span className="numeros text-17 font-bold text-primaria-forte">{formatarReais(valorProducao(l.quantidade, l.precoUnitario))}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => apagar(l.id)}
                    aria-label={`Apagar ${item?.nome ?? "lançamento"} de ${seloDia(l.data)}`}
                    className="flex size-12 shrink-0 items-center justify-center rounded-full text-texto-2 active:bg-erro-suave active:text-erro-texto"
                  >
                    <Trash2 aria-hidden className="size-5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {areas.length > 0 && (
        <section aria-labelledby="areas" className="flex flex-col gap-2 pb-2">
          <h2 id="areas" className="display text-24">Por área</h2>
          <ul className="cartao flex flex-col gap-3 p-4">
            {areas.map((a) => (
              <li key={a.area} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-15">
                  <span className="font-bold">{a.area}</span>
                  <span className="numeros font-bold">{formatarReais(a.valor)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-superficie-2">
                  <div className="h-full rounded-full bg-primaria" style={{ width: `${(a.valor / total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BottomSheet aberto={precos && !editandoItem} onFechar={() => setPrecos(false)} titulo="Preços e serviços" subtitulo="Toque num serviço para mudar o preço.">
        <div className="flex flex-col gap-3 pb-2">
          <label className="flex min-h-14 items-center gap-3 rounded-cartao border-2 border-borda-forte bg-superficie px-4 focus-within:border-primaria">
            <Search aria-hidden className="size-6 text-texto-2" />
            <span className="sr-only">Filtrar serviços</span>
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar" className="min-w-0 flex-1 bg-transparent text-20 outline-none" />
          </label>
          <ul className="cartao divide-y divide-borda overflow-hidden">
            {listaPrecos.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEditandoItem(i);
                    setPrecoTxt((i.preco / 100).toFixed(2).replace(".", ","));
                  }}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-17 font-bold">{i.nome}</span>
                    <span className="block text-13 text-texto-2">{i.area}{i.exemplo ? " · preço de exemplo" : ""}</span>
                  </span>
                  <span className="numeros text-right text-17 font-bold">
                    {formatarReais(i.preco)}
                    <span className="block text-13 font-normal text-texto-2">por {rotuloUnidade(i.unidade)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>

      <BottomSheet
        aberto={!!editandoItem}
        onFechar={() => setEditandoItem(null)}
        titulo={editandoItem?.nome ?? ""}
        subtitulo={editandoItem?.area}
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={salvarPreco} disabled={lerReais(precoTxt) === null}>Salvar preço</BotaoPrincipal>}
      >
        {editandoItem && (
          <div className="flex flex-col gap-4 pb-2">
            {editandoItem.exemplo && <SeloSugestao texto="Preço de exemplo — confira o valor que você cobra" />}
            <CampoNumero rotulo={`Preço por ${rotuloUnidade(editandoItem.unidade)}`} prefixo="R$" valor={precoTxt} onChange={setPrecoTxt} />
            <p className="text-15 text-texto-2">Lançamentos antigos mantêm o preço da época.</p>
            <BotaoPrincipal
              variante="perigo"
              icone={Trash2}
              onClick={async () => {
                const item = editandoItem;
                await removerItem(item);
                setEditandoItem(null);
                mostrar({ texto: `${item.nome} saiu da lista`, desfazer: () => salvarItem(item) });
              }}
            >
              Tirar da minha lista
            </BotaoPrincipal>
          </div>
        )}
      </BottomSheet>

    </main>
  );
}
