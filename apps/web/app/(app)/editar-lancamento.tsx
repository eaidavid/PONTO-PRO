"use client";

import { formatarQuantidade, formatarReais, type ItemProducao, type LancamentoProducao, lerReais, resumoEquipe, rotuloUnidade, seloDia, valorDoLancamento, valorProducao } from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, CampoNumero, useToast } from "@ponto-pro/ui";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apagarLancamento, lancarProducao } from "../../lib/acoes";

function lerQuantidade(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? Math.round(n * 1000) / 1000 : null;
}

/**
 * Corrige um lançamento de produção: quantidade e observação. O preço fica o da época.
 * Serviço da equipe: corrige o valor cheio do serviço; a parte da pessoa acompanha.
 */
export function EditarLancamento({ lancamento, item, onFechar, comDesfazer = true }: { lancamento: LancamentoProducao | null; item?: ItemProducao; onFechar: () => void; /** Desligue quando outro painel volta a abrir por cima do aviso. */ comDesfazer?: boolean }) {
  const { mostrar } = useToast();
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");
  const equipe = lancamento?.divisao;
  useEffect(() => {
    if (!lancamento) return;
    setQtd(lancamento.divisao ? (lancamento.precoUnitario / 100).toFixed(2).replace(".", ",") : formatarQuantidade(lancamento.quantidade));
    setObs(lancamento.descricao ?? "");
  }, [lancamento]);

  // no serviço da equipe, o campo é o valor cheio do serviço (a quantidade fica 1)
  const valorCheio = equipe ? lerReais(qtd) : null;
  const quantidade = equipe ? (valorCheio !== null && valorCheio > 0 ? 1 : null) : lerQuantidade(qtd);
  const un = rotuloUnidade(item?.unidade ?? "un");

  async function salvar() {
    if (!lancamento || quantidade === null) return;
    const { descricao: _, ...resto } = lancamento;
    const texto = obs.trim().slice(0, 200);
    await lancarProducao({ ...resto, quantidade, ...(equipe && valorCheio ? { precoUnitario: valorCheio } : {}), ...(texto ? { descricao: texto } : {}) });
    onFechar();
    mostrar({ texto: "Lançamento salvo", ...(comDesfazer ? { desfazer: () => lancarProducao(lancamento) } : {}) });
  }

  return (
    <BottomSheet
      aberto={!!lancamento}
      onFechar={onFechar}
      titulo={item?.nome ?? "Lançamento"}
      subtitulo={
        lancamento
          ? equipe
            ? `${seloDia(lancamento.data)}/${lancamento.data.slice(5, 7)} · serviço da equipe, você como ${equipe.minhaFuncao.toLowerCase()}`
            : `${seloDia(lancamento.data)}/${lancamento.data.slice(5, 7)} · ${formatarReais(lancamento.precoUnitario)} por ${un}`
          : undefined
      }
      rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={salvar} disabled={quantidade === null}>Salvar</BotaoPrincipal>}
    >
      {lancamento && (
        <div className="flex flex-col gap-4 pb-2">
          {equipe ? (
            <CampoNumero rotulo="Valor do serviço para a equipe" prefixo="R$" valor={qtd} onChange={setQtd} erro={quantidade === null ? "Digite o valor que o encarregado passou." : undefined} ajuda={`Equipe: ${resumoEquipe(equipe.equipe)}.`} />
          ) : (
            <CampoNumero rotulo="Quantidade" sufixo={un} valor={qtd} onChange={setQtd} erro={quantidade === null ? "Digite quanto você fez. Ex.: 4" : undefined} />
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-corpo font-bold">Observação</span>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value.slice(0, 200))}
              placeholder="Ex.: lado da portaria, 2º andar"
              rows={2}
              className="min-h-20 rounded-cartao border-2 border-borda-forte bg-superficie p-3 text-corpo outline-none focus:border-primaria"
            />
          </label>
          <p className="numeros rounded-cartao bg-superficie-2 p-4 text-center text-destaque font-bold">
            {quantidade === null
              ? "—"
              : equipe && valorCheio
                ? `Sua parte: ${Math.round(equipe.parte * 1000) / 10}% de ${formatarReais(valorCheio)} = ${formatarReais(valorDoLancamento({ quantidade: 1, precoUnitario: valorCheio, divisao: equipe }))}`
                : `${formatarQuantidade(quantidade)} ${un} × ${formatarReais(lancamento.precoUnitario)} = ${formatarReais(valorProducao(quantidade, lancamento.precoUnitario))}`}
          </p>
          <BotaoPrincipal
            variante="perigo"
            icone={Trash2}
            onClick={async () => {
              const antes = await apagarLancamento(lancamento.id);
              onFechar();
              mostrar({ texto: "Lançamento apagado", ...(comDesfazer && antes ? { desfazer: () => lancarProducao(antes) } : {}) });
            }}
          >
            Apagar lançamento
          </BotaoPrincipal>
        </div>
      )}
    </BottomSheet>
  );
}
