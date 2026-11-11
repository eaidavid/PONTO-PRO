"use client";

import { useSyncExternalStore } from "react";

/** Situação da conta e da sincronização, compartilhada entre as telas. */
export interface StatusNuvem {
  /** O app tem servidor configurado (variáveis do Supabase). */
  configurado: boolean;
  usuario: { id: string; email?: string; telefone?: string } | null;
  fase: "parado" | "sincronizando" | "erro";
  ultimaEm?: string;
}

export const NUVEM_CONFIGURADA = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let atual: StatusNuvem = { configurado: NUVEM_CONFIGURADA, usuario: null, fase: "parado" };
const ouvintes = new Set<() => void>();

export function mudarStatus(m: Partial<StatusNuvem>) {
  atual = { ...atual, ...m };
  for (const o of ouvintes) o();
}

export function lerStatus() {
  return atual;
}

const inicial: StatusNuvem = { configurado: NUVEM_CONFIGURADA, usuario: null, fase: "parado" };

export function useStatusNuvem(): StatusNuvem {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => atual,
    () => inicial,
  );
}

/** Estado do selo no topo da tela Hoje. */
export function seloSync(s: StatusNuvem, pendentes: number): "local" | "sincronizando" | "sincronizado" | "erro" {
  if (!s.usuario) return "local";
  if (s.fase === "sincronizando") return "sincronizando";
  if (s.fase === "erro") return "erro";
  return pendentes > 0 ? "local" : "sincronizado";
}

let pedir: (() => void) | null = null;
export function registrarPedido(f: (() => void) | null) {
  pedir = f;
}
/** Pede uma sincronização agora (se houver conta). */
export function sincronizarAgora() {
  pedir?.();
}
