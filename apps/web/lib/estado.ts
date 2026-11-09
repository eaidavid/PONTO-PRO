"use client";

import {
  type Agora,
  agoraEmSaoPaulo,
  type DiaRegistro,
  type ItemProducao,
  itensDosPacotes,
  type LancamentoProducao,
  MODELOS,
  type PerfilTrabalho,
} from "@ponto-pro/core";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { type DadosPessoais, db, type Preferencias } from "./db";

export interface Estado {
  perfil: PerfilTrabalho | null;
  pessoal: DadosPessoais;
  preferencias: Preferencias;
  /** A pessoa já escolheu a aparência no app (senão vale a do aparelho). */
  preferenciasSalvas: boolean;
  registros: DiaRegistro[];
  /** Catálogo do perfil + serviços próprios, sem os removidos. */
  itens: ItemProducao[];
  lancamentos: LancamentoProducao[];
  pendentes: number;
}

function temaDoAparelho(): Preferencias["tema"] {
  try {
    const t = localStorage.getItem("pp-tema");
    if (t === "claro" || t === "escuro" || t === "sol") return t;
  } catch {
    /* sem armazenamento */
  }
  return "auto";
}

/** Todo o estado do app, ao vivo a partir do banco local. undefined enquanto carrega. */
export function useEstado(): Estado | undefined {
  return useLiveQuery(async () => {
    const [config, registros, proprios, lancamentos, pendentes] = await Promise.all([
      db.config.toArray(),
      db.registros.toArray(),
      db.itens.toArray(),
      db.lancamentos.toArray(),
      db.fila.count(),
    ]);
    const cfg = Object.fromEntries(config.map((c) => [c.chave, c.valor]));
    const perfil = (cfg.perfil as PerfilTrabalho | undefined) ?? null;
    const base = perfil ? itensDosPacotes(perfil.producao.pacotes) : [];
    const porId = new Map<string, ItemProducao & { removido?: boolean }>(base.map((i) => [i.id, i]));
    for (const p of proprios) porId.set(p.id, p);
    const itens = [...porId.values()].filter((i) => !i.removido);
    return {
      perfil,
      pessoal: (cfg.pessoal as DadosPessoais | undefined) ?? {},
      preferencias: { tema: temaDoAparelho(), som: false, ...((cfg.preferencias as Preferencias | undefined) ?? {}) },
      preferenciasSalvas: !!cfg.preferencias,
      registros,
      itens,
      lancamentos: lancamentos.sort((a, b) => b.data.localeCompare(a.data) || b.atualizadoEm.localeCompare(a.atualizadoEm)),
      pendentes,
    };
  }, []);
}

/** Relógio de São Paulo, atualizado a cada 15 segundos. */
export function useAgora(): Agora | null {
  const [agora, setAgora] = useState<Agora | null>(null);
  useEffect(() => {
    const tick = () => setAgora(agoraEmSaoPaulo());
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return agora;
}

/** Quarta aba do perfil: Produção ou Metas. */
export function abaExtraDoPerfil(perfil: PerfilTrabalho): "producao" | "metas" {
  if (perfil.producao.ativo || perfil.pagamento.forma === "producao" || perfil.pagamento.forma === "misto") return "producao";
  return MODELOS[perfil.area].abaExtra;
}

/** Primeiro nome para a saudação. */
export function primeiroNome(p: DadosPessoais): string | null {
  return p.nome?.trim().split(/\s+/)[0] || null;
}
