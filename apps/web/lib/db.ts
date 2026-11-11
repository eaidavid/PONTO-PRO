import type { DiaRegistro, ItemProducao, LancamentoProducao, PerfilTrabalho } from "@ponto-pro/core";
import Dexie, { type Table } from "dexie";

/**
 * Banco local (IndexedDB). Tudo é salvo primeiro no aparelho.
 * Cada gravação entra na fila de sincronização e guarda o valor anterior no histórico
 * (base para o "último a editar vence" com histórico, no Milestone 5).
 */

export type Tema = "auto" | "claro" | "escuro" | "sol";

export type Tamanho = "compacto" | "padrao" | "grande";

export interface Preferencias {
  tema: Tema;
  tamanho: Tamanho;
  som: boolean;
  /** Obra usada ao bater o ponto e lançar produção (quando há mais de uma). */
  obraAtual?: string;
}

/** Aceite dos Termos e da Política de privacidade (com a versão aceita). */
export interface Consentimento {
  versao: string;
  em: string;
  /** Estatísticas de uso sem identificar a pessoa. */
  estatisticas: boolean;
}

/** Conferência de pagamento de um período (chave: data de fim do período). */
export interface ConferenciaSalva {
  fim: string;
  inicio: string;
  estimado: number;
  recebido: number;
  em: string;
}

export interface DadosPessoais {
  nome?: string;
  cargo?: string;
  empresa?: string;
  documento?: string;
}

export interface Config {
  chave: "perfil" | "pessoal" | "preferencias" | "obras" | "feriadosLocais" | "conferencias" | "consentimento" | "inicioUso" | "assinatura" | "sincronizacao";
  valor: unknown;
  atualizadoEm: string;
}

export type RegistroSalvo = DiaRegistro & { atualizadoEm: string };
export type ItemSalvo = ItemProducao & { atualizadoEm: string; removido?: boolean };
export type LancamentoSalvo = LancamentoProducao & { atualizadoEm: string };

export interface Pendencia {
  id?: number;
  tabela: string;
  chave: string;
  operacao: "salvar" | "apagar";
  em: string;
}

export interface Historico {
  id?: number;
  tabela: string;
  chave: string;
  antes: unknown;
  em: string;
}

class Banco extends Dexie {
  config!: Table<Config, string>;
  registros!: Table<RegistroSalvo, string>;
  itens!: Table<ItemSalvo, string>;
  lancamentos!: Table<LancamentoSalvo, string>;
  fila!: Table<Pendencia, number>;
  historico!: Table<Historico, number>;

  constructor() {
    super("ponto-pro");
    this.version(1).stores({
      config: "chave",
      registros: "data",
      itens: "id",
      lancamentos: "id, data",
      fila: "++id, tabela",
      historico: "++id, [tabela+chave]",
    });
    // v2: fila indexada por item (compactação: só a última operação de cada item fica na fila)
    this.version(2).stores({
      fila: "++id, tabela, [tabela+chave]",
    });
  }
}

export const db = new Banco();

export type { PerfilTrabalho };
