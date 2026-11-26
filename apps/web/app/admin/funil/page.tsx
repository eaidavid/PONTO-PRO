"use client";

import { useState } from "react";
import { useAdmin } from "../../../lib/admin-cliente";
import { Abas, Cabecalho, Estado, Recarregar } from "../comum";

interface Linha { evento: string; detalhe: string; aparelhos: number; total: number }
interface Funil { linhas: Linha[]; assinaram: number }

const ETAPAS: { evento: string; rotulo: string }[] = [
  { evento: "visita_vendas", rotulo: "Visitou a página de vendas" },
  { evento: "clique_comecar", rotulo: "Tocou em Começar" },
  { evento: "comecar_concluido", rotulo: "Terminou o começo" },
  { evento: "primeiro_ponto", rotulo: "Bateu o primeiro ponto" },
  { evento: "conta_criada", rotulo: "Criou conta" },
  { evento: "abriu_planos", rotulo: "Abriu Planos" },
];
const ORIGENS = [
  { id: "", rotulo: "Todas" },
  { id: "site", rotulo: "Página inicial" },
  { id: "calculadora", rotulo: "Calculadoras" },
  { id: "indicacao", rotulo: "Indicação" },
  { id: "beta", rotulo: "Convite do beta" },
];
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

/** Quebra de um evento pelo detalhe (seção do botão ou origem da oferta), do mais tocado ao menos. */
function Quebra({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  const total = linhas.reduce((t, l) => t + Number(l.aparelhos), 0);
  if (!total) return null;
  const ordenadas = [...linhas].sort((a, b) => Number(b.aparelhos) - Number(a.aparelhos)).slice(0, 8);
  return (
    <section className="flex flex-col gap-2 rounded-cartao border border-borda bg-superficie p-4">
      <h2 className="text-corpo font-bold">{titulo}</h2>
      <ul className="flex flex-col gap-1.5 text-apoio">
        {ordenadas.map((l) => (
          <li key={l.detalhe} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
            <span className="truncate">{l.detalhe || "sem nome"}</span>
            <span aria-hidden className="h-2 rounded-full bg-superficie-2"><span className="block h-full rounded-full bg-primaria" style={{ width: `${(Number(l.aparelhos) / total) * 100}%` }} /></span>
            <span className="numeros text-texto-2">{l.aparelhos} ({pct(Number(l.aparelhos), total)})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PaginaFunil() {
  const [dias, setDias] = useState("7");
  const [origem, setOrigem] = useState("");
  const { dados, erro, carregando, recarregar } = useAdmin<Funil>(`/api/admin/funil?dias=${dias}&origem=${origem}`);
  const soma = (evento: string) => (dados?.linhas ?? []).filter((l) => l.evento === evento).reduce((t, l) => t + Number(l.aparelhos), 0);
  const etapas = [...ETAPAS.map((e) => ({ ...e, valor: soma(e.evento) })), { evento: "assinou", rotulo: "Assinou", valor: dados?.assinaram ?? 0 }];
  const max = Math.max(1, ...etapas.map((e) => e.valor));

  return (
    <>
      <Cabecalho titulo="Funil" descricao="Aparelhos diferentes que passaram por cada etapa. Sem nome nem e-mail: só o evento e um código aleatório do aparelho." acao={<Recarregar onClick={recarregar} carregando={carregando} />} />
      <div className="flex flex-wrap gap-x-6">
        <Abas valor={dias} onChange={setDias} opcoes={[{ id: "1", rotulo: "Hoje" }, { id: "7", rotulo: "7 dias" }, { id: "30", rotulo: "30 dias" }, { id: "90", rotulo: "90 dias" }]} />
        <Abas valor={origem} onChange={setOrigem} opcoes={ORIGENS} />
      </div>
      <Estado erro={erro} carregando={carregando && !dados} />
      {dados && (
        <div className="flex flex-col gap-4">
          <section aria-labelledby="t-etapas" className="rounded-cartao border border-borda bg-superficie p-4">
            <h2 id="t-etapas" className="sr-only">Etapas do funil</h2>
            <ol className="flex flex-col gap-2.5">
              {etapas.map((e, i) => {
                const anterior = i > 0 ? etapas[i - 1]!.valor : 0;
                return (
                  <li key={e.evento} className="grid grid-cols-[minmax(0,12rem)_1fr_4.5rem_3.5rem] items-center gap-3 text-apoio">
                    <span className="truncate">{e.rotulo}</span>
                    <span aria-hidden className="h-5 rounded-[4px] bg-superficie-2">
                      <span className="block h-full rounded-[4px] bg-primaria" style={{ width: `${e.valor ? Math.max(1, (e.valor / max) * 100) : 0}%` }} />
                    </span>
                    <span className="numeros text-right font-bold">{e.valor.toLocaleString("pt-BR")}</span>
                    <span className="numeros text-right text-texto-2" title="passagem da etapa anterior">{i > 0 ? pct(e.valor, anterior) : ""}</span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-legenda text-texto-2">A porcentagem é a passagem da etapa de cima. "Assinou" conta assinaturas pagas do período, sem cortesia, e não segue o filtro de origem.</p>
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            <Quebra titulo="De onde vêm os toques em Começar" linhas={dados.linhas.filter((l) => l.evento === "clique_comecar")} />
            <Quebra titulo="Ofertas do Pro mais tocadas" linhas={dados.linhas.filter((l) => l.evento === "oferta_pro")} />
          </div>
        </div>
      )}
    </>
  );
}
