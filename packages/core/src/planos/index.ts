import { diasEntre, somarDias } from "../tempo";

/**
 * Planos e teste grátis. Regras puras: o app (cliente) e o servidor usam as mesmas.
 * Preços em centavos: valores SUGERIDOS — a decisão final é do negócio.
 */

export type Plano = "gratis" | "individual" | "equipe";

export type Recurso =
  | "historico"
  | "pdf"
  | "metas"
  | "exportar"
  | "conferencia"
  | "producao-ilimitada"
  | "equipe";

export const DIAS_TESTE = 14;
/** Dias de tolerância depois do vencimento antes de voltar ao Grátis. */
export const DIAS_TOLERANCIA = 5;
/** Lançamentos de produção por período no plano Grátis. */
export const LIMITE_PRODUCAO_GRATIS = 20;

export const PLANOS: Record<Plano, { nome: string; preco: number; porTrabalhador?: boolean; recursos: Recurso[]; resumo: string[] }> = {
  gratis: {
    nome: "Grátis",
    preco: 0,
    recursos: [],
    resumo: ["1 pessoa", "Período atual", `Até ${LIMITE_PRODUCAO_GRATIS} lançamentos de produção por período`],
  },
  individual: {
    nome: "Individual",
    preco: 1490,
    recursos: ["historico", "pdf", "metas", "exportar", "conferencia", "producao-ilimitada"],
    resumo: ["Histórico de todos os períodos", "Contracheque em PDF e planilha", "Metas e conferir pagamento", "Produção sem limite", "Seus dados na nuvem, em qualquer celular"],
  },
  equipe: {
    nome: "Equipe",
    preco: 990,
    porTrabalhador: true,
    recursos: ["historico", "pdf", "metas", "exportar", "conferencia", "producao-ilimitada", "equipe"],
    resumo: ["Tudo do Individual", "Convidar a equipe por link ou WhatsApp", "Aprovar ponto e produção", "Folha da equipe em PDF e planilha"],
  },
};

export type StatusAssinatura = "ativa" | "atrasada" | "cancelada";

export interface Assinatura {
  plano: Exclude<Plano, "gratis">;
  status: StatusAssinatura;
  /** Último dia já pago (inclusive). */
  pagoAte: string;
  trabalhadores?: number;
}

export interface SituacaoPlano {
  plano: Plano;
  emTeste: boolean;
  /** Dias de teste restantes (0 quando não está em teste). */
  diasDeTeste: number;
  /** Aviso para mostrar (pagamento atrasado, teste acabando). */
  aviso?: string;
}

/**
 * Plano que vale hoje.
 * - Assinatura paga em dia (ou dentro da tolerância de atraso) vale o plano assinado.
 * - Cancelada vale até o último dia pago.
 * - Sem assinatura: 14 dias de Individual a partir do primeiro uso; depois, Grátis.
 */
export function situacaoDoPlano(p: { assinatura: Assinatura | null; inicioUso: string; hoje: string }): SituacaoPlano {
  const { assinatura: a, hoje } = p;
  if (a) {
    if (a.status === "ativa" && hoje <= a.pagoAte) return { plano: a.plano, emTeste: false, diasDeTeste: 0 };
    if (a.status !== "cancelada" && hoje <= somarDias(a.pagoAte, DIAS_TOLERANCIA)) {
      return { plano: a.plano, emTeste: false, diasDeTeste: 0, aviso: "Seu pagamento está atrasado. Confira em Planos para não perder o acesso." };
    }
    if (a.status === "cancelada" && hoje <= a.pagoAte) {
      return { plano: a.plano, emTeste: false, diasDeTeste: 0, aviso: `Sua assinatura foi cancelada e vale até ${a.pagoAte.slice(8, 10)}/${a.pagoAte.slice(5, 7)}.` };
    }
  }
  const usados = diasEntre(p.inicioUso, hoje);
  const restantes = DIAS_TESTE - usados;
  if (!a && restantes > 0) {
    return {
      plano: "individual",
      emTeste: true,
      diasDeTeste: restantes,
      ...(restantes <= 3 ? { aviso: `Seu teste grátis acaba ${restantes === 1 ? "amanhã" : `em ${restantes} dias`}.` } : {}),
    };
  }
  return { plano: "gratis", emTeste: false, diasDeTeste: 0 };
}

export function pode(plano: Plano, recurso: Recurso): boolean {
  return PLANOS[plano].recursos.includes(recurso);
}

/** Valor mensal da assinatura. */
export function valorMensal(plano: Exclude<Plano, "gratis">, trabalhadores = 1): number {
  const p = PLANOS[plano];
  return p.porTrabalhador ? p.preco * Math.max(1, trabalhadores) : p.preco;
}

/** Equipe: mínimo e máximo de trabalhadores numa assinatura. */
export const TRABALHADORES_MIN = 2;
export const TRABALHADORES_MAX = 200;

/** Último dia coberto por uma mensalidade que vence em `vencimento` (um mês depois, menos um dia). */
export function pagoAteDoPagamento(vencimento: string): string {
  const [a, m, d] = vencimento.split("-").map(Number) as [number, number, number];
  const ano = m === 12 ? a + 1 : a;
  const mes = m === 12 ? 1 : m + 1;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(d, ultimo);
  return somarDias(`${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`, -1);
}

/** CPF (11 dígitos) ou CNPJ (14 dígitos) com dígitos verificadores válidos. Devolve só os números, ou null. */
export function lerCpfCnpj(texto: string): string | null {
  const n = texto.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(n)) return null;
  const dv = (base: string, pesos: number[]) => {
    const r = pesos.reduce((t, p, i) => t + Number(base[i]) * p, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (n.length === 11) {
    const d1 = dv(n, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = dv(n, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === Number(n[9]) && d2 === Number(n[10]) ? n : null;
  }
  if (n.length === 14) {
    const d1 = dv(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = dv(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === Number(n[12]) && d2 === Number(n[13]) ? n : null;
  }
  return null;
}
