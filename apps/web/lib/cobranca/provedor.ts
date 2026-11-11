import type { Assinatura, Plano } from "@ponto-pro/core";

/** Pedido de assinatura (a pessoa já está logada; `conta` é o id da conta no banco). */
export interface PedidoAssinatura {
  conta: string;
  plano: Exclude<Plano, "gratis">;
  trabalhadores: number;
  nome: string;
  cpfCnpj: string;
  email?: string;
  telefone?: string;
  /** Primeiro vencimento (AAAA-MM-DD). */
  vencimento: string;
}

/** Mudança de assinatura vinda do provedor (webhook). null = evento que não muda nada. */
export interface AtualizacaoAssinatura {
  conta: string;
  assinatura: Assinatura;
  provedorCliente?: string;
  provedorAssinatura: string;
}

/** Quem cobra. Interface para trocar o Asaas por outro provedor sem mexer no app. */
export interface ProvedorCobranca {
  /** Cria cliente e assinatura mensal; devolve o link da primeira cobrança (Pix ou cartão). */
  assinar(p: PedidoAssinatura): Promise<{ link: string; provedorCliente: string; provedorAssinatura: string }>;
  /** Traduz um aviso (webhook) do provedor. */
  interpretarAviso(corpo: unknown): Promise<AtualizacaoAssinatura | null>;
}
