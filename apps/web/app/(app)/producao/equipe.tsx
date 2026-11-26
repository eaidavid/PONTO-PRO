"use client";

import { dividirEquipe, EQUIPE_PADRAO, formatarReais, type FuncaoEquipe, resumoEquipe } from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, Chip, cx } from "@ponto-pro/ui";
import { Minus, Plus, Save } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { salvarEquipe } from "../../../lib/acoes";
import type { EquipeSalva } from "../../../lib/estado";

const pct = (p: number) => `${(Math.round(p * 1000) / 10).toLocaleString("pt-BR")}%`;
const pesoTxt = (p: number) => p.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const EXEMPLO = 100000;

/** Parte de quem lança, de 0 a 1, pela equipe salva (ou a padrão). */
export function parteDaEquipe(e: EquipeSalva | null): number {
  const eq = e ?? { equipe: EQUIPE_PADRAO, minhaFuncao: "Profissional" };
  return dividirEquipe(EXEMPLO, eq.equipe, eq.minhaFuncao, eq.igual).parte;
}

/** "Você: meio oficial, 26% · 4 pessoas" */
export function resumoDaEquipe(e: EquipeSalva | null): string {
  const eq = e ?? { equipe: EQUIPE_PADRAO, minhaFuncao: "Profissional" };
  const d = dividirEquipe(EXEMPLO, eq.equipe, eq.minhaFuncao, eq.igual);
  return `Você: ${eq.minhaFuncao.toLowerCase()}, ${pct(d.parte)} · ${d.pessoas} ${d.pessoas === 1 ? "pessoa" : "pessoas"}`;
}

/**
 * Configura a equipe uma vez: quantas pessoas de cada função, como dividem e qual é a sua.
 * Depois, cada lançamento com a chave "Dividido com a equipe" grava só a sua parte.
 */
export function AjustarEquipe({ aberto, onFechar, salva }: { aberto: boolean; onFechar: () => void; salva: EquipeSalva | null }) {
  const id = useId();
  const [equipe, setEquipe] = useState<FuncaoEquipe[]>(salva?.equipe ?? EQUIPE_PADRAO);
  const [minhaFuncao, setMinhaFuncao] = useState(salva?.minhaFuncao ?? "Profissional");
  const [igual, setIgual] = useState(salva?.igual ?? false);
  const [verPesos, setVerPesos] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    setEquipe(salva?.equipe ?? EQUIPE_PADRAO);
    setMinhaFuncao(salva?.minhaFuncao ?? "Profissional");
    setIgual(salva?.igual ?? false);
  }, [aberto, salva]);

  const d = dividirEquipe(EXEMPLO, equipe, minhaFuncao, igual);
  const funcoesNaEquipe = equipe.filter((f) => f.quantidade > 0);
  const valida = d.parte > 0;
  const mudarFuncao = (i: number, m: Partial<FuncaoEquipe>) => setEquipe((e) => e.map((f, j) => (j === i ? { ...f, ...m } : f)));
  const passo = "inline-flex size-10 items-center justify-center rounded-full bg-superficie-2 active:scale-95 disabled:opacity-40";

  async function salvar() {
    if (!valida) return;
    await salvarEquipe({ equipe, minhaFuncao, igual, ligada: true });
    onFechar();
  }

  return (
    <BottomSheet
      aberto={aberto}
      onFechar={onFechar}
      titulo="Sua equipe"
      subtitulo="Configure uma vez. Nos lançamentos, ligue “Dividido com a equipe” e o app grava só a sua parte."
      rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={salvar} disabled={!valida}>Salvar equipe</BotaoPrincipal>}
    >
      <div className="flex flex-col gap-5 pb-4">
        <section aria-labelledby={`${id}-t-eq`} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id={`${id}-t-eq`} className="text-corpo font-bold">Quem está na equipe</h3>
            {!igual && (
              <button type="button" onClick={() => setVerPesos((v) => !v)} aria-expanded={verPesos} className="text-apoio font-bold text-primaria-forte underline underline-offset-4">
                {verPesos ? "Esconder pesos" : "Ajustar pesos"}
              </button>
            )}
          </div>
          <ul className="cartao divide-y divide-borda">
            {equipe.map((f, i) => (
              <li key={f.funcao} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-corpo font-bold">{f.funcao}</span>
                  <button type="button" className={passo} aria-label={`Menos um ${f.funcao.toLowerCase()}`} disabled={f.quantidade === 0} onClick={() => mudarFuncao(i, { quantidade: f.quantidade - 1 })}>
                    <Minus aria-hidden className="size-4" />
                  </button>
                  <output aria-label={`${f.funcao}: ${f.quantidade} na equipe`} className="numeros w-6 text-center text-destaque font-bold">{f.quantidade}</output>
                  <button type="button" className={passo} aria-label={`Mais um ${f.funcao.toLowerCase()}`} disabled={f.quantidade >= 20} onClick={() => mudarFuncao(i, { quantidade: f.quantidade + 1 })}>
                    <Plus aria-hidden className="size-4" />
                  </button>
                </div>
                {verPesos && !igual && (
                  <label className="flex items-center justify-between gap-3 text-apoio text-texto-2">
                    Peso na divisão
                    <input
                      className="numeros w-20 rounded-pequeno border-2 border-borda-forte bg-superficie px-2 py-1.5 text-right text-corpo text-texto"
                      inputMode="decimal"
                      defaultValue={pesoTxt(f.peso)}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(",", "."));
                        if (v > 0 && v <= 10) mudarFuncao(i, { peso: v });
                      }}
                    />
                  </label>
                )}
              </li>
            ))}
          </ul>
          <div role="group" aria-label="Como a equipe divide" className="flex flex-wrap gap-2">
            <Chip selecionado={!igual} onClick={() => setIgual(false)}>Pela função</Chip>
            <Chip selecionado={igual} onClick={() => setIgual(true)}>Por igual</Chip>
          </div>
        </section>

        <section aria-labelledby={`${id}-t-eu`} className="flex flex-col gap-2">
          <h3 id={`${id}-t-eu`} className="text-corpo font-bold">Você é</h3>
          <div role="group" aria-label="Sua função" className="flex flex-wrap gap-2">
            {funcoesNaEquipe.map((f) => (
              <Chip key={f.funcao} selecionado={minhaFuncao === f.funcao} onClick={() => setMinhaFuncao(f.funcao)}>{f.funcao}</Chip>
            ))}
          </div>
          {!valida && <p className="text-apoio text-erro-texto">Escolha a sua função entre as da equipe.</p>}
        </section>

        {d.pessoas > 0 && (
          <section aria-labelledby={`${id}-t-div`} className="flex flex-col gap-2 rounded-cartao bg-primaria-suave p-4">
            <h3 id={`${id}-t-div`} className="text-corpo font-bold">Exemplo: um serviço de {formatarReais(EXEMPLO)}</h3>
            <p className="text-apoio text-texto-2">Dividido entre {resumoEquipe(equipe)}.</p>
            <table className="w-full text-apoio">
              <tbody>
                {d.linhas.map((l) => (
                  <tr key={l.funcao} className={cx(l.funcao === minhaFuncao && "font-bold")}>
                    <th scope="row" className="py-1 text-left font-[inherit]">
                      {l.funcao}{l.quantidade > 1 ? ` (${l.quantidade})` : ""}{l.funcao === minhaFuncao ? ", você" : ""}
                    </th>
                    <td className="numeros py-1 text-right text-texto-2">{pct(l.parte)}{l.quantidade > 1 ? " cada" : ""}</td>
                    <td className="numeros py-1 pl-3 text-right">{formatarReais(l.cada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
