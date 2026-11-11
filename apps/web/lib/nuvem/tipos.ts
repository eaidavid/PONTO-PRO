import type { Assinatura } from "@ponto-pro/core";

/** Tabelas locais que sobem para a nuvem. */
export type TabelaSync = "registros" | "itens" | "lancamentos" | "config";
export const TABELAS_SYNC: TabelaSync[] = ["config", "registros", "itens", "lancamentos"];

/** Uma linha como ela vive na nuvem: o valor inteiro em JSON, com a hora da última edição. */
export interface Linha {
  chave: string;
  dados: unknown;
  atualizadoEm: string;
  apagado: boolean;
}

/** O servidor. Uma interface para trocar o Supabase por outro (ou por um falso, nos testes). */
export interface Remoto {
  enviar(tabela: TabelaSync, linhas: Linha[]): Promise<void>;
  /** Linhas alteradas depois de `desde` (ou todas), em ordem de atualização. */
  buscar(tabela: TabelaSync, desde: string | null): Promise<Linha[]>;
  assinatura(): Promise<Assinatura | null>;
}

/** Guardado na config local "sincronizacao" (fica só no aparelho). */
export interface EstadoSincronizacao {
  usuario: string;
  cursores: Partial<Record<TabelaSync, string>>;
  ultimaEm?: string;
}
