"use client";

import {
  dividirEquipe,
  EQUIPE_PADRAO,
  formatarReais,
  type FuncaoEquipe,
  type ItemProducao,
  lerReais,
  resumoEquipe,
} from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, Chip, cx, useToast } from "@ponto-pro/ui";
import { Minus, Plus, Trash2, Users } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { apagarLancamento, lancarProducao, novoId, salvarEquipe, salvarItem } from "../../../lib/acoes";
import type { EquipeSalva } from "../../../lib/estado";

interface Servico {
  chave: string;
  nome: string;
  valor: string;
}

const novoServico = (): Servico => ({ chave: Math.random().toString(36).slice(2), nome: "", valor: "" });
const pct = (p: number) => `${(Math.round(p * 1000) / 10).toLocaleString("pt-BR")}%`;
const pesoTxt = (p: number) => p.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/**
 * Serviço da equipe: o encarregado passa o valor de cada serviço (às vezes de uma medição parcial) e a equipe
 * divide pela função. A pessoa lança os serviços com o valor cheio e o app guarda só a parte dela.
 */
export function ServicoEquipe({
  aberto,
  onFechar,
  data,
  obraId,
  itens,
  salva,
  bloqueado,
}: {
  aberto: boolean;
  onFechar: () => void;
  data: string;
  obraId?: string;
  itens: ItemProducao[];
  salva: EquipeSalva | null;
  bloqueado: boolean;
}) {
  const id = useId();
  const { mostrar } = useToast();
  const [grupo, setGrupo] = useState("");
  const [servicos, setServicos] = useState<Servico[]>([novoServico()]);
  const [equipe, setEquipe] = useState<FuncaoEquipe[]>(salva?.equipe ?? EQUIPE_PADRAO);
  const [minhaFuncao, setMinhaFuncao] = useState(salva?.minhaFuncao ?? "Profissional");
  const [igual, setIgual] = useState(salva?.igual ?? false);
  const [verPesos, setVerPesos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const validos = servicos.flatMap((s) => {
    const v = lerReais(s.valor);
    return s.nome.trim().length >= 2 && v !== null && v > 0 ? [{ nome: s.nome.trim(), valor: v }] : [];
  });
  const total = validos.reduce((t, s) => t + s.valor, 0);
  const divisao = useMemo(() => dividirEquipe(total, equipe, minhaFuncao, igual), [total, equipe, minhaFuncao, igual]);
  const nomesServicos = useMemo(() => [...new Set(itens.filter((i) => i.area === "Equipe").map((i) => i.nome))], [itens]);
  const funcoesNaEquipe = equipe.filter((f) => f.quantidade > 0);
  const pronto = !bloqueado && validos.length > 0 && divisao.parte > 0;

  const mudarFuncao = (i: number, mudanca: Partial<FuncaoEquipe>) => setEquipe((e) => e.map((f, j) => (j === i ? { ...f, ...mudanca } : f)));

  async function lancar() {
    if (!pronto) return;
    setSalvando(true);
    try {
      const efetiva = equipe.map((f) => ({ ...f, peso: igual ? 1 : f.peso }));
      const ids: string[] = [];
      for (const s of validos) {
        // um serviço por nome na categoria "Equipe", com o último valor combinado
        let item = itens.find((i) => i.area === "Equipe" && i.nome.toLowerCase() === s.nome.toLowerCase());
        if (!item) {
          item = { id: novoId("i"), nome: s.nome, area: "Equipe", unidade: "verba", preco: s.valor, exemplo: false };
          await salvarItem(item);
        } else if (item.preco !== s.valor) {
          await salvarItem({ ...item, preco: s.valor });
        }
        const lid = novoId("l");
        ids.push(lid);
        await lancarProducao({
          id: lid,
          data,
          itemId: item.id,
          quantidade: 1,
          precoUnitario: s.valor,
          ...(grupo.trim() ? { descricao: grupo.trim() } : {}),
          ...(obraId ? { obraId } : {}),
          divisao: { parte: divisao.parte, minhaFuncao, equipe: efetiva, ...(grupo.trim() ? { grupo: grupo.trim() } : {}) },
        });
      }
      await salvarEquipe({ equipe, minhaFuncao, igual });
      mostrar({
        texto: `Sua parte: ${formatarReais(divisao.minhaParte)} (${validos.length === 1 ? "1 serviço" : `${validos.length} serviços`})`,
        desfazer: async () => {
          for (const l of ids) await apagarLancamento(l);
        },
      });
      setServicos([novoServico()]);
      setGrupo("");
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  const campo = "min-h-12 w-full rounded-pequeno border-2 border-borda-forte bg-superficie px-3 text-corpo outline-none focus:border-primaria";
  const passo = "inline-flex size-10 items-center justify-center rounded-full bg-superficie-2 active:scale-95 disabled:opacity-40";

  return (
    <BottomSheet
      aberto={aberto}
      onFechar={onFechar}
      titulo="Serviço da equipe"
      subtitulo="O valor que o encarregado passou, dividido pela função de cada um."
      rodape={
        <BotaoPrincipal tamanho="g" icone={Users} onClick={lancar} disabled={!pronto || salvando}>
          {salvando ? "Lançando…" : pronto ? `Lançar minha parte: ${formatarReais(divisao.minhaParte)}` : "Lançar minha parte"}
        </BotaoPrincipal>
      }
    >
      <div className="flex flex-col gap-5 pb-4">
        <label htmlFor={`${id}-grupo`} className="flex flex-col gap-1.5 text-corpo font-bold">
          Nome da empreitada <span className="text-apoio font-normal text-texto-2">opcional, ex.: Laje do 2º andar, 1ª medição</span>
          <input id={`${id}-grupo`} className={campo} value={grupo} onChange={(e) => setGrupo(e.target.value)} maxLength={60} />
        </label>

        <section aria-labelledby={`${id}-t-serv`} className="flex flex-col gap-2">
          <h3 id={`${id}-t-serv`} className="text-corpo font-bold">Serviços e valor de cada um</h3>
          <datalist id={`${id}-nomes`}>{nomesServicos.map((n) => <option key={n} value={n} />)}</datalist>
          <ul className="flex flex-col gap-2">
            {servicos.map((s, i) => (
              <li key={s.chave} className="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-center gap-2">
                <input
                  aria-label={`Serviço ${i + 1}`}
                  className={campo}
                  placeholder={["Forma", "Armação", "Concretagem"][i] ?? "Serviço"}
                  value={s.nome}
                  list={`${id}-nomes`}
                  maxLength={80}
                  onChange={(e) => setServicos((l) => l.map((x) => (x.chave === s.chave ? { ...x, nome: e.target.value } : x)))}
                />
                <input
                  aria-label={`Valor do serviço ${i + 1}`}
                  className={cx(campo, "numeros text-right")}
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                  value={s.valor}
                  onChange={(e) => setServicos((l) => l.map((x) => (x.chave === s.chave ? { ...x, valor: e.target.value.replace(/[^\d.,]/g, "") } : x)))}
                />
                <button
                  type="button"
                  aria-label={`Tirar o serviço ${i + 1}`}
                  disabled={servicos.length === 1}
                  onClick={() => setServicos((l) => l.filter((x) => x.chave !== s.chave))}
                  className="inline-flex size-11 items-center justify-center rounded-full text-texto-2 active:bg-superficie-2 disabled:opacity-30"
                >
                  <Trash2 aria-hidden className="size-5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setServicos((l) => [...l, novoServico()])} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-apoio font-bold text-primaria-forte active:bg-primaria-suave">
              <Plus aria-hidden className="size-4" /> Outro serviço
            </button>
            <span className="numeros text-apoio">Total da equipe: <b>{formatarReais(total)}</b></span>
          </div>
        </section>

        <section aria-labelledby={`${id}-t-eq`} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id={`${id}-t-eq`} className="text-corpo font-bold">Quem está na equipe</h3>
            <button type="button" onClick={() => setVerPesos((v) => !v)} aria-expanded={verPesos} className="text-apoio font-bold text-primaria-forte underline underline-offset-4">
              {verPesos ? "Esconder pesos" : "Ajustar pesos"}
            </button>
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
          {!funcoesNaEquipe.some((f) => f.funcao === minhaFuncao) && <p className="text-apoio text-erro-texto">Escolha a sua função entre as da equipe.</p>}
        </section>

        {total > 0 && divisao.pessoas > 0 && (
          <section aria-labelledby={`${id}-t-div`} className="flex flex-col gap-2 rounded-cartao bg-primaria-suave p-4">
            <h3 id={`${id}-t-div`} className="text-corpo font-bold">Como fica a divisão</h3>
            <p className="text-apoio text-texto-2">{formatarReais(total)} para {resumoEquipe(equipe)}.</p>
            <table className="w-full text-apoio">
              <tbody>
                {divisao.linhas.map((l) => (
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
            {divisao.sobra !== 0 && <p className="text-legenda text-texto-2">Arredondamento: {formatarReais(Math.abs(divisao.sobra))} {divisao.sobra > 0 ? "sobra" : "falta"} na divisão.</p>}
          </section>
        )}
        {bloqueado && <p className="text-apoio text-erro-texto">Você chegou ao limite de lançamentos do plano Grátis neste período.</p>}
      </div>
    </BottomSheet>
  );
}
