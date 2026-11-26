"use client";

import {
  buscarItens,
  formatarReais,
  type ItemProducao,
  lerReais,
  previaProducao,
  rotuloUnidade,
  UNIDADES_CHIPS,
} from "@ponto-pro/core";
import { PackagePlus, Plus, Search, Star, Users } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { BotaoPrincipal } from "./BotaoPrincipal";
import { CampoNumero } from "./CampoNumero";
import { Chip } from "./Chip";
import { Interruptor } from "./Interruptor";

export interface LancamentoNovo {
  item: ItemProducao;
  /** true quando o serviço foi criado agora. */
  novo: boolean;
  quantidade: number;
  /** Observação do lançamento (ex.: "lado da portaria", "2º andar"). */
  descricao?: string;
  /** Valor combinado nesta vez (serviço de valor fechado, em verba). */
  precoUnitario?: number;
  /** Lançado como serviço da equipe: só a parte da pessoa entra. */
  equipe?: boolean;
}

/** Serviço da equipe dentro do lançamento normal: uma chave e a parte de quem lança. */
export interface EquipeBusca {
  ligada: boolean;
  /** Parte da pessoa, de 0 a 1. */
  parte: number;
  /** "Você: meio oficial, 26% · 4 pessoas" */
  resumo: string;
  onLigar: (ligada: boolean) => void;
  onAjustar: () => void;
}

export interface BuscaServicoProps {
  itens: ItemProducao[];
  onLancar: (l: LancamentoNovo) => void;
  /** Para testes e demonstração. */
  textoInicial?: string;
  quantidadeInicial?: string;
  /** Já começa com este serviço escolhido (ex.: "Lançar de novo"). */
  itemInicial?: ItemProducao | null;
  /** Mostra a estrela de favorito em cada serviço. */
  onFavoritar?: (item: ItemProducao) => void;
  /** Conteúdo entre o campo e a lista (ex.: categorias), só quando não está digitando. */
  entreBuscaELista?: ReactNode;
  /** Quantas sugestões mostrar sem busca (padrão 4). */
  sugestoes?: number;
  /** Mostra a chave "Dividido com a equipe" no lançamento. */
  equipe?: EquipeBusca;
}

function lerQuantidade(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Busca no catálogo sem ligar para acentos, com "+ Criar" quando não existe. */
export function BuscaServico({ itens, onLancar, textoInicial = "", quantidadeInicial = "", itemInicial = null, onFavoritar, entreBuscaELista, sugestoes = 4, equipe }: BuscaServicoProps) {
  const [texto, setTexto] = useState(textoInicial);
  const [escolhido, setEscolhido] = useState<ItemProducao | null>(itemInicial);
  const [criando, setCriando] = useState<string | null>(null);
  const [unidade, setUnidade] = useState<string>("m");
  const [outra, setOutra] = useState("");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState(quantidadeInicial);
  const [observacao, setObservacao] = useState("");
  const [tentou, setTentou] = useState(false);
  /** Valor desta vez num serviço de valor fechado (verba). */
  const [valorFechado, setValorFechado] = useState(itemInicial?.unidade === "verba" ? (itemInicial.preco / 100).toFixed(2).replace(".", ",") : "");

  const resultado = useMemo(() => buscarItens(itens, texto, texto.trim() ? 8 : sugestoes), [itens, texto, sugestoes]);
  const unidadeFinal = unidade === "outra" ? outra.trim() : unidade;
  // valor fechado (verba): digita o valor combinado desta vez, sem quantidade
  const fechado = (escolhido?.unidade ?? unidadeFinal) === "verba";
  const precoCentavos = fechado ? lerReais(escolhido ? valorFechado : preco) : escolhido ? escolhido.preco : lerReais(preco);
  const qtd = fechado ? 1 : lerQuantidade(quantidade);
  const previa = qtd && precoCentavos !== null && unidadeFinal ? previaProducao(qtd, escolhido?.unidade ?? unidadeFinal, precoCentavos) : null;
  const naEquipe = !!equipe?.ligada;
  const minhaParte = previa && naEquipe ? Math.round(previa.valor * equipe!.parte) : null;

  function lancar() {
    setTentou(true);
    if (!qtd || precoCentavos === null || !unidadeFinal) return;
    const item: ItemProducao =
      escolhido ?? {
        id: `novo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        nome: criando!.trim(),
        area: "Meus serviços",
        unidade: unidadeFinal,
        preco: precoCentavos,
        exemplo: false,
      };
    onLancar({
      item,
      novo: !escolhido,
      quantidade: qtd,
      ...(fechado && escolhido ? { precoUnitario: precoCentavos } : {}),
      ...(naEquipe ? { equipe: true } : {}),
      ...(observacao.trim() ? { descricao: observacao.trim().slice(0, 200) } : {}),
    });
  }

  function escolher(i: ItemProducao) {
    setEscolhido(i);
    if (i.unidade === "verba") setValorFechado((i.preco / 100).toFixed(2).replace(".", ","));
  }

  function recomecar() {
    setEscolhido(null);
    setCriando(null);
    setTentou(false);
  }

  if (escolhido || criando !== null) {
    const nome = escolhido?.nome ?? criando!;
    const un = escolhido ? rotuloUnidade(escolhido.unidade) : rotuloUnidade(unidadeFinal || "…");
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-cartao bg-primaria-suave p-4">
          <div className="flex-1">
            <p className="text-legenda font-bold text-primaria-forte">{escolhido ? escolhido.area : "Serviço novo"}</p>
            <p className="text-destaque font-bold">{nome}</p>
            {escolhido && (
              <p className="numeros text-apoio text-texto-2">
                {formatarReais(escolhido.preco)} por {rotuloUnidade(escolhido.unidade)}
                {escolhido.exemplo && " · preço de exemplo, edite se precisar"}
              </p>
            )}
          </div>
          <button type="button" onClick={recomecar} className="-mr-2 min-h-12 rounded-full px-3 text-apoio font-bold text-primaria-forte underline underline-offset-4">
            Trocar
          </button>
        </div>

        {criando !== null && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-corpo font-bold" id="rotulo-unidade">Unidade</span>
              <div role="group" aria-labelledby="rotulo-unidade" className="flex flex-wrap gap-2">
                {[...UNIDADES_CHIPS, "outra"].map((u) => (
                  <Chip key={u} selecionado={unidade === u} onClick={() => setUnidade(u)}>
                    {u === "outra" ? "Outra" : rotuloUnidade(u)}
                  </Chip>
                ))}
              </div>
              {unidade === "outra" && (
                <input
                  aria-label="Nome da unidade"
                  value={outra}
                  onChange={(e) => setOutra(e.target.value.slice(0, 12))}
                  placeholder="Ex.: balde, viagem"
                  className="min-h-14 rounded-cartao border-2 border-borda-forte bg-superficie px-4 text-destaque outline-none focus:border-primaria"
                />
              )}
            </div>
            <CampoNumero
              rotulo={fechado ? (naEquipe ? "Valor do serviço para a equipe" : "Valor do serviço") : `Preço por ${un}`}
              prefixo="R$"
              valor={preco}
              onChange={setPreco}
              placeholder="0,00"
              erro={tentou && precoCentavos === null ? (fechado ? "Digite o valor combinado. Ex.: 775,00" : "Digite o preço. Ex.: 12,00") : undefined}
            />
          </>
        )}

        {fechado && escolhido ? (
          <CampoNumero
            rotulo={naEquipe ? "Valor do serviço para a equipe" : "Valor do serviço"}
            prefixo="R$"
            valor={valorFechado}
            onChange={setValorFechado}
            placeholder="0,00"
            ajuda="O valor que o encarregado passou desta vez."
            erro={tentou && precoCentavos === null ? "Digite o valor combinado. Ex.: 775,00" : undefined}
          />
        ) : (
          !fechado && (
            <CampoNumero
              rotulo="Quantidade"
              sufixo={un}
              valor={quantidade}
              onChange={setQuantidade}
              placeholder="0"
              erro={tentou && !qtd ? "Digite quanto você fez. Ex.: 50" : undefined}
            />
          )
        )}

        {equipe && (
          <div className="flex flex-col rounded-cartao border-2 border-borda px-4">
            <Interruptor rotulo="Dividido com a equipe" descricao={equipe.resumo} valor={equipe.ligada} onChange={equipe.onLigar} />
            <button type="button" onClick={equipe.onAjustar} className="-mt-1 mb-2 min-h-11 self-start text-apoio font-bold text-primaria-forte underline underline-offset-4">
              Ajustar a equipe
            </button>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-corpo font-bold">Observação <span className="font-normal text-texto-2">(opcional)</span></span>
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value.slice(0, 200))}
            placeholder="Ex.: lado da portaria, 2º andar"
            className="min-h-14 rounded-cartao border-2 border-borda-forte bg-superficie px-4 text-corpo outline-none focus:border-primaria"
          />
        </label>

        <p aria-live="polite" className="numeros rounded-cartao bg-superficie-2 p-4 text-center text-destaque font-bold">
          {previa
            ? minhaParte !== null
              ? `${fechado ? formatarReais(previa.valor) : previa.texto} da equipe → sua parte ${formatarReais(minhaParte)}`
              : fechado
                ? formatarReais(previa.valor)
                : previa.texto
            : fechado
              ? "R$ 0,00"
              : `0 ${un} × ${precoCentavos !== null ? formatarReais(precoCentavos) : "R$ 0,00"} = R$ 0,00`}
        </p>

        <BotaoPrincipal tamanho="g" icone={naEquipe ? Users : PackagePlus} onClick={lancar}>
          {naEquipe ? (minhaParte !== null ? `Lançar minha parte: ${formatarReais(minhaParte)}` : "Lançar minha parte") : "Lançar produção"}
        </BotaoPrincipal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-14 items-center gap-3 rounded-cartao border-2 border-borda-forte bg-superficie px-4 focus-within:border-primaria">
        <Search aria-hidden className="size-6 text-texto-2" />
        <span className="sr-only">Buscar serviço</span>
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite o serviço"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-destaque outline-none placeholder:text-texto-2"
        />
      </label>
      {!texto.trim() && entreBuscaELista}
      {!texto.trim() && <p className="px-1 text-apoio text-texto-2">Seus favoritos e os mais usados primeiro</p>}
      <ul className="flex flex-col divide-y divide-borda overflow-hidden cartao" aria-label="Serviços encontrados">
        {resultado.itens.map((i) => (
          <li key={i.id} className="flex items-stretch">
            {onFavoritar && (
              <button
                type="button"
                onClick={() => onFavoritar(i)}
                aria-pressed={!!i.favorito}
                aria-label={i.favorito ? `Tirar ${i.nome} dos favoritos` : `Marcar ${i.nome} como favorito`}
                className="flex w-12 shrink-0 items-center justify-center text-texto-2 active:bg-superficie-2"
              >
                <Star aria-hidden className={i.favorito ? "size-5 fill-[color:var(--extra)] text-extra" : "size-5"} />
              </button>
            )}
            <button type="button" onClick={() => escolher(i)} className={`flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pr-4 text-left active:bg-superficie-2 ${onFavoritar ? "pl-1" : "pl-4"}`}>
              <span className="min-w-0 flex-1">
                <span className="block text-corpo font-bold">{i.nome}</span>
                <span className="block text-apoio text-texto-2">{i.area}</span>
              </span>
              <span className="numeros text-right text-corpo font-bold text-primaria">
                {formatarReais(i.preco)}
                <span className="block text-legenda font-normal text-texto-2">por {rotuloUnidade(i.unidade)}</span>
              </span>
            </button>
          </li>
        ))}
        {resultado.criar && (
          <li>
            <button type="button" onClick={() => setCriando(resultado.criar)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left font-bold text-primaria active:bg-primaria-suave">
              <Plus aria-hidden className="size-6" strokeWidth={2.5} />
              <span className="text-corpo">Criar “{resultado.criar}”</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
