"use client";

import {
  categoriasDe,
  formatarQuantidade,
  formatarReais,
  type ItemProducao,
  lerReais,
  LIMITE_PRODUCAO_GRATIS,
  ordenarPorUso,
  periodoDaData,
  rotuloUnidade,
  somarDias,
  valorProducao,
} from "@ponto-pro/core";
import {
  Bloqueio,
  BotaoPrincipal,
  BottomSheet,
  BuscaServico,
  CampoNumero,
  Chip,
  SeloSugestao,
  TituloSecao,
  useToast,
} from "@ponto-pro/ui";
import { ChevronDown, ChevronLeft, HardHat, Save, Search, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { apagarLancamento, lancarProducao, novoId, removerItem, salvarItem, salvarPreferencias } from "../../../lib/acoes";
import { useAgora, useEstado } from "../../../lib/estado";
import { situacaoAtual } from "../../../lib/plano";
import { Carregando } from "../../carregando";

const ROTULO_DIA: Record<0 | -1 | -2, string> = { 0: "Hoje", [-1]: "Ontem", [-2]: "Anteontem" };
const pilula = "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-borda-forte bg-superficie px-4 text-15 font-bold active:bg-superficie-2";

/** Tela de lançar produção: favoritos primeiro, categorias, obra e dia. */
export default function LancarProducao() {
  const estado = useEstado();
  const agora = useAgora();
  const { mostrar } = useToast();
  const [chave, setChave] = useState(0);
  const [quando, setQuando] = useState<0 | -1 | -2>(0);
  const [area, setArea] = useState<string | null>(null);
  const [precos, setPrecos] = useState(false);
  const [escolherObra, setEscolherObra] = useState(false);
  const [escolherDia, setEscolherDia] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [editandoItem, setEditandoItem] = useState<ItemProducao | null>(null);
  const [precoTxt, setPrecoTxt] = useState("");

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const periodo = periodoDaData(agora.data, estado.perfil.ciclo.diaFechamento);
    const doPeriodo = estado.lancamentos.filter((l) => l.data >= periodo.inicio && l.data <= periodo.fim);
    return {
      total: doPeriodo.reduce((t, l) => t + valorProducao(l.quantidade, l.precoUnitario), 0),
      ordenados: ordenarPorUso(estado.itens, estado.lancamentos),
    };
  }, [estado, agora]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { itens, lancamentos, obrasAtivas, preferencias } = estado;
  const { total, ordenados } = calc;
  const porId = new Map(itens.map((i) => [i.id, i]));
  const data = somarDias(agora.data, quando);
  const obraAtual = obrasAtivas.find((o) => o.id === preferencias.obraAtual)?.id;
  const visiveis = area ? ordenados.filter((i) => i.area === area) : ordenados;

  const periodoAtual = periodoDaData(agora.data, estado.perfil.ciclo.diaFechamento);
  const noPeriodo = lancamentos.filter((l) => l.data >= periodoAtual.inicio && l.data <= periodoAtual.fim).length;
  const noLimite = !situacaoAtual(estado).pode("producao-ilimitada") && noPeriodo >= LIMITE_PRODUCAO_GRATIS;

  async function lancar({ item, novo, quantidade }: { item: ItemProducao; novo: boolean; quantidade: number }) {
    if (noLimite) return;
    if (novo) await salvarItem(item);
    const id = novoId("l");
    await lancarProducao({ id, data, itemId: item.id, quantidade, precoUnitario: item.preco, ...(obraAtual ? { obraId: obraAtual } : {}) });
    setChave((k) => k + 1);
    mostrar({
      texto: `${novo ? "Serviço criado. " : ""}${formatarQuantidade(quantidade)} ${rotuloUnidade(item.unidade)} · ${formatarReais(valorProducao(quantidade, item.preco))}`,
      desfazer: () => apagarLancamento(id),
    });
  }

  async function favoritar(item: ItemProducao) {
    await salvarItem({ ...item, favorito: !item.favorito });
  }

  async function salvarPreco() {
    if (!editandoItem) return;
    const preco = lerReais(precoTxt);
    if (preco === null) return;
    await salvarItem({ ...editandoItem, preco, exemplo: false });
    setEditandoItem(null);
    mostrar({ texto: `Preço de ${editandoItem.nome} salvo` });
  }

  const listaPrecos = filtro ? itens.filter((i) => i.nome.toLowerCase().includes(filtro.toLowerCase())) : itens;

  return (
    <main className="flex flex-col gap-5 px-4">
      <header className="flex items-center justify-between gap-2 pt-4">
        <Link href="/historico?aba=producao" className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-full px-2 text-15 font-bold active:bg-superficie-2">
          <ChevronLeft aria-hidden className="size-6" /> Produção
        </Link>
        <button type="button" onClick={() => setPrecos(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 text-15 font-bold text-primaria-forte active:bg-primaria-suave">
          <Tags aria-hidden className="size-5" /> Preços
        </button>
      </header>
      <div>
        <h1 className="display text-32">Lançar produção</h1>
        <p className="numeros text-15 text-texto-2">No período: {formatarReais(total)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-15 font-bold text-texto-2">Para</span>
        <button type="button" onClick={() => setEscolherDia(true)} className={pilula}>
          {ROTULO_DIA[quando]} <ChevronDown aria-hidden className="size-4" />
        </button>
        {obrasAtivas.length > 0 && (
          <button type="button" onClick={() => setEscolherObra(true)} className={pilula}>
            <HardHat aria-hidden className="size-4" />
            {obrasAtivas.find((o) => o.id === obraAtual)?.nome ?? "Sem obra"} <ChevronDown aria-hidden className="size-4" />
          </button>
        )}
      </div>

      {noLimite && (
        <Bloqueio
          titulo={`Você chegou a ${LIMITE_PRODUCAO_GRATIS} lançamentos neste período`}
          texto="No plano Grátis dá para lançar até 20 serviços por período. Com o Individual, é sem limite."
          acao={<Link href="/planos" className="inline-flex min-h-12 items-center rounded-full bg-primaria px-5 text-17 font-bold text-sobre-primaria">Ver planos</Link>}
        />
      )}

      <section aria-label="Escolher serviço" className="pb-4">
        <BuscaServico
          key={chave}
          itens={visiveis}
          onLancar={lancar}
          onFavoritar={favoritar}
          sugestoes={6}
          entreBuscaELista={
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Categorias">
              {[null, ...categoriasDe(itens)].map((c) => (
                <Chip key={c ?? "todas"} className="shrink-0" selecionado={area === c} onClick={() => setArea(c)}>
                  {c ?? "Todas"}
                </Chip>
              ))}
            </div>
          }
        />
      </section>

      <BottomSheet aberto={escolherDia} onFechar={() => setEscolherDia(false)} titulo="Dia do serviço">
        <div className="flex flex-wrap gap-2 pb-4">
          {([0, -1, -2] as const).map((d) => (
            <Chip key={d} selecionado={quando === d} onClick={() => { setQuando(d); setEscolherDia(false); }}>
              {ROTULO_DIA[d]}
            </Chip>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet aberto={escolherObra} onFechar={() => setEscolherObra(false)} titulo="Obra do lançamento">
        <div className="flex flex-wrap gap-2 pb-4">
          <Chip selecionado={!obraAtual} onClick={async () => { await salvarPreferencias({ ...preferencias, obraAtual: undefined }); setEscolherObra(false); }}>Nenhuma</Chip>
          {obrasAtivas.map((o) => (
            <Chip key={o.id} selecionado={obraAtual === o.id} onClick={async () => { await salvarPreferencias({ ...preferencias, obraAtual: o.id }); setEscolherObra(false); }}>
              {o.nome}
            </Chip>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet aberto={precos && !editandoItem} onFechar={() => setPrecos(false)} titulo="Preços e serviços" subtitulo="Toque num serviço para mudar o preço.">
        <div className="flex flex-col gap-3 pb-2">
          <label className="flex min-h-14 items-center gap-3 rounded-full border-2 border-borda-forte bg-superficie px-4 focus-within:border-primaria">
            <Search aria-hidden className="size-5 text-texto-2" />
            <span className="sr-only">Filtrar serviços</span>
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar" className="min-w-0 flex-1 bg-transparent text-17 outline-none" />
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
