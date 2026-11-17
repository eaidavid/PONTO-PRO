"use client";

import { DIAS_TOLERANCIA, formatarReais, PLANOS, valorDoCiclo } from "@ponto-pro/core";
import { ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { dataCurtaBr, useAdmin } from "../../../lib/admin-cliente";
import { receitaMensal } from "../../../lib/admin-numeros";
import { Abas, Cabecalho, Estado, Numero, Recarregar, Tabela } from "../comum";

interface Assinatura {
  account_id: string;
  email: string | null;
  plano: "individual" | "equipe";
  ciclo: "mensal" | "anual";
  status: "ativa" | "atrasada" | "cancelada";
  pago_ate: string;
  trabalhadores: number | null;
  provedor: string;
  provedor_assinatura: string | null;
  criado_em: string;
}
type Aba = "ativa" | "atrasada" | "cancelada" | "cortesia";

function grupo(a: Assinatura, hoje: string): Aba {
  if (a.provedor === "cortesia") return "cortesia";
  if (a.status === "cancelada" || a.pago_ate < hoje) return a.status === "atrasada" ? "atrasada" : "cancelada";
  return a.status === "atrasada" ? "atrasada" : "ativa";
}

function Conteudo() {
  const inicial = useSearchParams().get("aba");
  const [aba, setAba] = useState<Aba>(inicial === "atrasada" || inicial === "cancelada" || inicial === "cortesia" ? inicial : "ativa");
  const { dados, erro, carregando, recarregar } = useAdmin<{ assinaturas: Assinatura[] }>("/api/admin/assinaturas");
  const hoje = new Date().toISOString().slice(0, 10);
  const todas = dados?.assinaturas ?? [];
  const conta = (g: Aba) => todas.filter((a) => grupo(a, hoje) === g).length;
  const lista = todas.filter((a) => grupo(a, hoje) === aba);
  const receita = receitaMensal(todas, hoje);

  return (
    <>
      <Cabecalho titulo="Assinaturas" descricao="Quem paga, quem está atrasado e quem tem cortesia. Reembolsos e cobranças são feitos no painel do Asaas." acao={<Recarregar onClick={recarregar} carregando={carregando} />} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Receita por mês" valor={formatarReais(receita)} apoio="anuidades ÷ 12, sem cortesia" />
        <Numero rotulo="Ativas" valor={conta("ativa")} />
        <Numero rotulo="Atrasadas" valor={conta("atrasada")} tom={conta("atrasada") ? "atencao" : undefined} />
        <Numero rotulo="Cortesias" valor={conta("cortesia")} />
      </div>
      <Abas<Aba>
        valor={aba}
        onChange={setAba}
        opcoes={[
          { id: "ativa", rotulo: `Ativas ${conta("ativa")}` },
          { id: "atrasada", rotulo: `Atrasadas ${conta("atrasada")}` },
          { id: "cancelada", rotulo: `Canceladas ${conta("cancelada")}` },
          { id: "cortesia", rotulo: `Cortesia ${conta("cortesia")}` },
        ]}
      />
      <Estado erro={erro} carregando={carregando && !dados} vazio={!!dados && !lista.length} textoVazio="Nenhuma assinatura nesta aba." />
      {!!lista.length && (
        <Tabela cabecalho={["E-mail", "Plano", "Ciclo", "Situação", "Pago até", "Valor", "Asaas"]}>
          {lista.map((a) => {
            const atraso = Math.floor((Date.parse(hoje) - Date.parse(a.pago_ate)) / 86_400_000);
            return (
              <tr key={a.account_id}>
                <td className="font-bold">{a.email ?? "—"}</td>
                <td>{PLANOS[a.plano]?.nome ?? a.plano}</td>
                <td>{a.ciclo}</td>
                <td>
                  {a.provedor === "cortesia" ? "cortesia" : a.status}
                  {aba === "atrasada" && atraso >= 0 && <span className="block text-legenda text-texto-2">{atraso >= DIAS_TOLERANCIA ? "tolerância acabou" : `faltam ${DIAS_TOLERANCIA - atraso} dias de tolerância`}</span>}
                </td>
                <td className="numeros">{dataCurtaBr(a.pago_ate)}</td>
                <td className="numeros">{a.provedor === "cortesia" ? "—" : formatarReais(valorDoCiclo(a.plano, a.ciclo, a.trabalhadores ?? 1))}</td>
                <td>
                  {a.provedor === "asaas" && a.provedor_assinatura ? (
                    <a href={`https://www.asaas.com/subscriptions/show/${a.provedor_assinatura.replace(/^sub_/, "")}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 font-bold text-primaria-forte">
                      abrir <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </Tabela>
      )}
    </>
  );
}

export default function Assinaturas() {
  return (
    <Suspense>
      <Conteudo />
    </Suspense>
  );
}
