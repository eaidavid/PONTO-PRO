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
import { PackagePlus, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BotaoPrincipal } from "./BotaoPrincipal";
import { CampoNumero } from "./CampoNumero";
import { Chip } from "./Chip";

export interface LancamentoNovo {
  item: ItemProducao;
  /** true quando o serviço foi criado agora. */
  novo: boolean;
  quantidade: number;
}

export interface BuscaServicoProps {
  itens: ItemProducao[];
  onLancar: (l: LancamentoNovo) => void;
  /** Para testes e demonstração. */
  textoInicial?: string;
  quantidadeInicial?: string;
}

function lerQuantidade(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Busca no catálogo sem ligar para acentos, com "+ Criar" quando não existe. */
export function BuscaServico({ itens, onLancar, textoInicial = "", quantidadeInicial = "" }: BuscaServicoProps) {
  const [texto, setTexto] = useState(textoInicial);
  const [escolhido, setEscolhido] = useState<ItemProducao | null>(null);
  const [criando, setCriando] = useState<string | null>(null);
  const [unidade, setUnidade] = useState<string>("m");
  const [outra, setOutra] = useState("");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState(quantidadeInicial);
  const [tentou, setTentou] = useState(false);

  const resultado = useMemo(() => buscarItens(itens, texto, 8), [itens, texto]);
  const unidadeFinal = unidade === "outra" ? outra.trim() : unidade;
  const precoCentavos = escolhido ? escolhido.preco : lerReais(preco);
  const qtd = lerQuantidade(quantidade);
  const previa = qtd && precoCentavos !== null && unidadeFinal ? previaProducao(qtd, escolhido?.unidade ?? unidadeFinal, precoCentavos) : null;

  function lancar() {
    setTentou(true);
    if (!qtd || precoCentavos === null || !unidadeFinal) return;
    const item: ItemProducao =
      escolhido ?? {
        id: `novo-${Date.now()}`,
        nome: criando!.trim(),
        area: "Meus serviços",
        unidade: unidadeFinal,
        preco: precoCentavos,
        exemplo: false,
      };
    onLancar({ item, novo: !escolhido, quantidade: qtd });
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
            <p className="text-13 font-bold text-primaria-forte">{escolhido ? escolhido.area : "Serviço novo"}</p>
            <p className="text-20 font-bold">{nome}</p>
            {escolhido && (
              <p className="numeros text-15 text-texto-2">
                {formatarReais(escolhido.preco)} por {rotuloUnidade(escolhido.unidade)}
                {escolhido.exemplo && " · preço de exemplo, edite se precisar"}
              </p>
            )}
          </div>
          <button type="button" onClick={recomecar} className="-mr-2 min-h-12 rounded-full px-3 text-15 font-bold text-primaria-forte underline underline-offset-4">
            Trocar
          </button>
        </div>

        {criando !== null && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-17 font-bold" id="rotulo-unidade">Unidade</span>
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
                  className="min-h-14 rounded-cartao border-2 border-borda-forte bg-superficie px-4 text-20 outline-none focus:border-primaria"
                />
              )}
            </div>
            <CampoNumero
              rotulo={`Preço por ${un}`}
              prefixo="R$"
              valor={preco}
              onChange={setPreco}
              placeholder="0,00"
              erro={tentou && precoCentavos === null ? "Digite o preço. Ex.: 12,00" : undefined}
            />
          </>
        )}

        <CampoNumero
          rotulo="Quantidade"
          sufixo={un}
          valor={quantidade}
          onChange={setQuantidade}
          placeholder="0"
          erro={tentou && !qtd ? "Digite quanto você fez. Ex.: 50" : undefined}
        />

        <p aria-live="polite" className="numeros rounded-cartao bg-superficie-2 p-4 text-center text-20 font-bold">
          {previa ? previa.texto : `0 ${un} × ${precoCentavos !== null ? formatarReais(precoCentavos) : "R$ 0,00"} = R$ 0,00`}
        </p>

        <BotaoPrincipal tamanho="g" icone={PackagePlus} onClick={lancar}>
          Lançar produção
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
          className="min-w-0 flex-1 bg-transparent text-20 outline-none placeholder:text-texto-2"
        />
      </label>
      <ul className="flex flex-col divide-y divide-borda overflow-hidden rounded-cartao bg-superficie borda" aria-label="Serviços encontrados">
        {resultado.itens.map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => setEscolhido(i)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-superficie-2">
              <span className="flex-1">
                <span className="block text-17 font-bold">{i.nome}</span>
                <span className="block text-15 text-texto-2">{i.area}</span>
              </span>
              <span className="numeros text-right text-17 font-bold text-primaria">
                {formatarReais(i.preco)}
                <span className="block text-13 font-normal text-texto-2">por {rotuloUnidade(i.unidade)}</span>
              </span>
            </button>
          </li>
        ))}
        {resultado.criar && (
          <li>
            <button type="button" onClick={() => setCriando(resultado.criar)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left font-bold text-primaria active:bg-primaria-suave">
              <Plus aria-hidden className="size-6" strokeWidth={2.5} />
              <span className="text-17">Criar “{resultado.criar}”</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
