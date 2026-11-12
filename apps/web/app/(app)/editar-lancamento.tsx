"use client";

import { formatarQuantidade, formatarReais, type ItemProducao, type LancamentoProducao, rotuloUnidade, seloDia, valorProducao } from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, CampoNumero, useToast } from "@ponto-pro/ui";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apagarLancamento, lancarProducao } from "../../lib/acoes";

function lerQuantidade(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? Math.round(n * 1000) / 1000 : null;
}

/** Corrige um lançamento de produção: quantidade e observação. O preço fica o da época. */
export function EditarLancamento({ lancamento, item, onFechar, comDesfazer = true }: { lancamento: LancamentoProducao | null; item?: ItemProducao; onFechar: () => void; /** Desligue quando outro painel volta a abrir por cima do aviso. */ comDesfazer?: boolean }) {
  const { mostrar } = useToast();
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");
  useEffect(() => {
    if (!lancamento) return;
    setQtd(formatarQuantidade(lancamento.quantidade));
    setObs(lancamento.descricao ?? "");
  }, [lancamento]);

  const quantidade = lerQuantidade(qtd);
  const un = rotuloUnidade(item?.unidade ?? "un");

  async function salvar() {
    if (!lancamento || quantidade === null) return;
    const { descricao: _, ...resto } = lancamento;
    const texto = obs.trim().slice(0, 200);
    await lancarProducao({ ...resto, quantidade, ...(texto ? { descricao: texto } : {}) });
    onFechar();
    mostrar({ texto: "Lançamento salvo", ...(comDesfazer ? { desfazer: () => lancarProducao(lancamento) } : {}) });
  }

  return (
    <BottomSheet
      aberto={!!lancamento}
      onFechar={onFechar}
      titulo={item?.nome ?? "Lançamento"}
      subtitulo={lancamento ? `${seloDia(lancamento.data)}/${lancamento.data.slice(5, 7)} · ${formatarReais(lancamento.precoUnitario)} por ${un}` : undefined}
      rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={salvar} disabled={quantidade === null}>Salvar</BotaoPrincipal>}
    >
      {lancamento && (
        <div className="flex flex-col gap-4 pb-2">
          <CampoNumero rotulo="Quantidade" sufixo={un} valor={qtd} onChange={setQtd} erro={quantidade === null ? "Digite quanto você fez. Ex.: 4" : undefined} />
          <label className="flex flex-col gap-1.5">
            <span className="text-17 font-bold">Observação</span>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value.slice(0, 200))}
              placeholder="Ex.: lado da portaria, 2º andar"
              rows={2}
              className="min-h-20 rounded-cartao border-2 border-borda-forte bg-superficie p-3 text-17 outline-none focus:border-primaria"
            />
          </label>
          <p className="numeros rounded-cartao bg-superficie-2 p-4 text-center text-20 font-bold">
            {quantidade !== null ? `${formatarQuantidade(quantidade)} ${un} × ${formatarReais(lancamento.precoUnitario)} = ${formatarReais(valorProducao(quantidade, lancamento.precoUnitario))}` : "—"}
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
