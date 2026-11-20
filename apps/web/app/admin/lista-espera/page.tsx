"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { dataCurtaBr, pedirAdmin, useAdmin } from "../../../lib/admin-cliente";
import { Cabecalho, Estado, Numero, Recarregar, Tabela } from "../comum";

interface Linha { plano: "equipe" | "individual"; nome: string; whatsapp: string; pessoas: number | null; origem: string; criado_em: string }

const telefone = (d: string) => (d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d);

export default function ListaEspera() {
  const { dados, erro, carregando, recarregar } = useAdmin<{ lista: Linha[] }>("/api/admin/lista-espera");
  const [baixando, setBaixando] = useState(false);
  const lista = dados?.lista ?? [];
  const turma = lista.filter((l) => l.plano === "equipe");
  const trabalhadores = turma.reduce((t, l) => t + (l.pessoas ?? 0), 0);

  async function baixar() {
    setBaixando(true);
    try {
      const texto = await pedirAdmin<string>("/api/admin/lista-espera?formato=csv");
      const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "lista-de-espera.csv" });
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Lista de espera"
        descricao="Quem pediu para ser avisado quando as assinaturas do Pro ou o plano Turma abrirem."
        acao={
          <div className="flex gap-2">
            <button type="button" onClick={baixar} disabled={baixando || !lista.length} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primaria px-4 text-apoio font-bold text-sobre-primaria disabled:opacity-50">
              <Download aria-hidden className="size-4" /> Baixar planilha
            </button>
            <Recarregar onClick={recarregar} carregando={carregando} />
          </div>
        }
      />
      {dados && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:max-w-[840px] lg:grid-cols-3">
          <Numero rotulo="Esperando o Pro" valor={lista.length - turma.length} apoio="avisar e liberar cortesia se o teste acabar" />
          <Numero rotulo="Esperando a Turma" valor={turma.length} />
          <Numero rotulo="Trabalhadores da Turma" valor={trabalhadores} apoio="quantos cada um disse que tem" />
        </div>
      )}
      <Estado erro={erro} carregando={carregando && !dados} vazio={!!dados && !lista.length} textoVazio="Ninguém entrou na lista ainda." />
      {!!lista.length && (
        <Tabela cabecalho={["Plano", "Nome", "WhatsApp", "Pessoas", "Origem", "Quando"]}>
          {lista.map((l) => (
            <tr key={l.plano + l.whatsapp}>
              <td>{l.plano === "equipe" ? "Turma" : "Pro"}</td>
              <td className="font-bold">{l.nome}</td>
              <td className="numeros"><a href={`https://wa.me/55${l.whatsapp}`} target="_blank" rel="noreferrer" className="text-primaria-forte underline-offset-2 hover:underline">{telefone(l.whatsapp)}</a></td>
              <td className="numeros">{l.pessoas ?? "—"}</td>
              <td>{l.origem}</td>
              <td className="numeros">{dataCurtaBr(l.criado_em.slice(0, 10))}</td>
            </tr>
          ))}
        </Tabela>
      )}
    </>
  );
}
