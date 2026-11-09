"use client";

import { calcularPeriodo, formatarDuracao, formatarReais, type Obra, periodoDaData, rotuloPeriodo, valorProducao } from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, CabecalhoTela, CampoTexto, EstadoVazio, TituloSecao, useToast } from "@ponto-pro/ui";
import { Archive, ArchiveRestore, ChevronRight, HardHat, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { novoId, salvarObras } from "../../../lib/acoes";
import { useAgora, useEstado } from "../../../lib/estado";
import { Carregando } from "../../carregando";

/** Obras: separar horas e produção por lugar ou cliente. */
export default function Obras() {
  const estado = useEstado();
  const agora = useAgora();
  const { mostrar } = useToast();
  const [nome, setNome] = useState("");
  const [editando, setEditando] = useState<Obra | null>(null);

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const periodo = periodoDaData(agora.data, estado.perfil.ciclo.diaFechamento);
    const r = calcularPeriodo({ perfil: estado.perfil, periodo, registros: estado.registros, feriadosLocais: estado.feriadosLocais, agora });
    const porObra = new Map<string, { horas: number; producao: number }>();
    const regs = new Map(estado.registros.map((x) => [x.data, x]));
    for (const d of r.dias) {
      const o = regs.get(d.data)?.obraId;
      if (!o) continue;
      const t = porObra.get(o) ?? { horas: 0, producao: 0 };
      t.horas += d.trabalhadoMin;
      porObra.set(o, t);
    }
    for (const l of estado.lancamentos) {
      if (!l.obraId || l.data < periodo.inicio || l.data > periodo.fim) continue;
      const t = porObra.get(l.obraId) ?? { horas: 0, producao: 0 };
      t.producao += valorProducao(l.quantidade, l.precoUnitario);
      porObra.set(l.obraId, t);
    }
    return { periodo, porObra };
  }, [estado, agora]);

  if (!estado?.perfil || !calc) return <Carregando />;
  const { obras } = estado;
  const { periodo, porObra } = calc;
  const ativas = obras.filter((o) => !o.arquivada);
  const arquivadas = obras.filter((o) => o.arquivada);

  async function adicionar() {
    const n = nome.trim();
    if (!n) return;
    await salvarObras([...obras, { id: novoId("o"), nome: n.slice(0, 40), arquivada: false }]);
    setNome("");
    mostrar({ texto: `Obra "${n}" criada` });
  }

  async function salvarEdicao() {
    if (!editando?.nome.trim()) return;
    await salvarObras(obras.map((o) => (o.id === editando.id ? { ...editando, nome: editando.nome.trim() } : o)));
    setEditando(null);
    mostrar({ texto: "Obra salva" });
  }

  const Lista = ({ lista }: { lista: Obra[] }) => (
    <ul className="cartao divide-y divide-borda overflow-hidden">
      {lista.map((o) => {
        const t = porObra.get(o.id);
        return (
          <li key={o.id}>
            <button type="button" onClick={() => setEditando({ ...o })} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-primaria-forte">
                <HardHat aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-17 font-bold">{o.nome}</span>
                <span className="numeros block text-15 text-texto-2">
                  {t ? [t.horas ? `${formatarDuracao(t.horas)} no período` : null, t.producao ? formatarReais(t.producao) : null].filter(Boolean).join(" · ") : "Sem registros no período"}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-texto-2" />
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="flex flex-col gap-5 px-4 pb-4">
      <CabecalhoTela titulo="Obras" subtitulo={`Período ${rotuloPeriodo(periodo)}`} />
      <p className="text-17 text-texto-2">Trabalha em mais de um lugar? Escolha a obra ao bater o ponto e lançar produção, e filtre o histórico por obra.</p>

      <div className="cartao flex flex-col gap-3 p-4">
        <CampoTexto rotulo="Nova obra" valor={nome} onChange={setNome} placeholder="Ex.: Casa da Ana, Obra Jardim" maxLength={40} onKeyDown={(e) => e.key === "Enter" && adicionar()} />
        <BotaoPrincipal variante="secundaria" icone={Plus} disabled={!nome.trim()} onClick={adicionar}>Adicionar obra</BotaoPrincipal>
      </div>

      {ativas.length === 0 ? (
        <EstadoVazio icone={HardHat} frase="Nenhuma obra cadastrada" />
      ) : (
        <section className="flex flex-col gap-2">
          <TituloSecao>Ativas</TituloSecao>
          <Lista lista={ativas} />
          <Link href="/historico" className="px-1 text-15 font-bold text-primaria-forte underline underline-offset-4">Ver o histórico por obra</Link>
        </section>
      )}
      {arquivadas.length > 0 && (
        <section className="flex flex-col gap-2">
          <TituloSecao>Arquivadas</TituloSecao>
          <Lista lista={arquivadas} />
        </section>
      )}

      <BottomSheet
        aberto={!!editando}
        onFechar={() => setEditando(null)}
        titulo="Editar obra"
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={salvarEdicao} disabled={!editando?.nome.trim()}>Salvar</BotaoPrincipal>}
      >
        {editando && (
          <div className="flex flex-col gap-4 pb-2">
            <CampoTexto rotulo="Nome" valor={editando.nome} onChange={(v) => setEditando({ ...editando, nome: v })} maxLength={40} />
            <BotaoPrincipal
              variante="fantasma"
              icone={editando.arquivada ? ArchiveRestore : Archive}
              onClick={async () => {
                const alvo = { ...editando, arquivada: !editando.arquivada };
                await salvarObras(obras.map((o) => (o.id === alvo.id ? alvo : o)));
                setEditando(null);
                mostrar({ texto: alvo.arquivada ? "Obra arquivada (o histórico continua)" : "Obra reativada" });
              }}
            >
              {editando.arquivada ? "Reativar obra" : "Arquivar obra"}
            </BotaoPrincipal>
          </div>
        )}
      </BottomSheet>
    </main>
  );
}
