"use client";

import {
  type Agora,
  agoraEmSaoPaulo,
  type Assinatura,
  type DiaRegistro,
  type Feriado,
  type ItemProducao,
  type Obra,
  itensDosPacotes,
  type LancamentoProducao,
  MODELOS,
  type PerfilTrabalho,
  somarDias,
} from "@ponto-pro/core";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { type ConferenciaSalva, type Consentimento, type DadosPessoais, db, type Preferencias } from "./db";

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
  obras: Obra[];
  /** Obras não arquivadas. */
  obrasAtivas: Obra[];
  feriadosLocais: Feriado[];
  conferencias: ConferenciaSalva[];
  consentimento: Consentimento | null;
  /** Data do primeiro uso (começo do teste grátis). */
  inicioUso: string | null;
  assinatura: Assinatura | null;
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

function tamanhoDoAparelho(): Preferencias["tamanho"] {
  try {
    const z = localStorage.getItem("pp-tamanho");
    if (z === "compacto" || z === "grande") return z;
  } catch {
    /* sem armazenamento */
  }
  return "padrao";
}

/** Quantos dias de histórico ficam em memória (cobre o período atual e o anterior). */
const JANELA_DIAS = 75;

function inicioDaJanela(): string {
  return somarDias(agoraEmSaoPaulo().data, -JANELA_DIAS);
}

/**
 * Estado do app, ao vivo a partir do banco local. undefined enquanto carrega.
 * Carrega só os últimos ~2 períodos: o app continua leve com anos de histórico.
 */
export function useEstado(): Estado | undefined {
  return useLiveQuery(async () => {
    const desde = inicioDaJanela();
    const [config, registros, proprios, lancamentos, pendentes] = await Promise.all([
      db.config.toArray(),
      db.registros.where("data").aboveOrEqual(desde).toArray(),
      db.itens.toArray(),
      db.lancamentos.where("data").aboveOrEqual(desde).toArray(),
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
      preferencias: { tema: temaDoAparelho(), tamanho: tamanhoDoAparelho(), som: false, ...((cfg.preferencias as Preferencias | undefined) ?? {}) },
      preferenciasSalvas: !!cfg.preferencias,
      registros,
      itens,
      lancamentos: lancamentos.sort((a, b) => b.data.localeCompare(a.data) || b.atualizadoEm.localeCompare(a.atualizadoEm)),
      pendentes,
      obras: (cfg.obras as Obra[] | undefined) ?? [],
      obrasAtivas: ((cfg.obras as Obra[] | undefined) ?? []).filter((o) => !o.arquivada),
      feriadosLocais: (cfg.feriadosLocais as Feriado[] | undefined) ?? [],
      conferencias: (cfg.conferencias as ConferenciaSalva[] | undefined) ?? [],
      consentimento: (cfg.consentimento as Consentimento | undefined) ?? null,
      inicioUso: (cfg.inicioUso as string | undefined) ?? null,
      assinatura: (cfg.assinatura as Assinatura | undefined) ?? null,
    };
  }, []);
}

/** Registros de um período qualquer (para navegar no histórico antigo). */
export function useRegistrosDoPeriodo(inicio: string, fim: string): DiaRegistro[] | undefined {
  return useLiveQuery(() => db.registros.where("data").between(inicio, fim, true, true).toArray(), [inicio, fim]);
}

/** Lançamentos de produção de um período qualquer. */
export function useLancamentosDoPeriodo(inicio: string, fim: string): LancamentoProducao[] | undefined {
  return useLiveQuery(
    async () => (await db.lancamentos.where("data").between(inicio, fim, true, true).toArray()).sort((a, b) => b.data.localeCompare(a.data)),
    [inicio, fim],
  );
}

/** Histórico longo (para o resumo de períodos passados). Só carrega quando pedido. */
export function useHistoricoLongo(ativo: boolean, desde: string) {
  return useLiveQuery(
    async () =>
      ativo
        ? {
            registros: await db.registros.where("data").aboveOrEqual(desde).toArray(),
            lancamentos: await db.lancamentos.where("data").aboveOrEqual(desde).toArray(),
          }
        : null,
    [ativo, desde],
  );
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
