import { diasEntre, somarDias } from "../tempo";

/**
 * Planos e teste grátis. Regras puras: o app (cliente) e o servidor usam as mesmas.
 * Preços em centavos: valores SUGERIDOS — a decisão final é do negócio.
 *
 * Os identificadores ficam como estão no banco e na cobrança ("individual", "equipe");
 * o nome que a pessoa vê é o de `PLANOS[id].nome` ("Pro", "Turma").
 */

export type Plano = "gratis" | "individual" | "equipe";
/** De quanto em quanto tempo a assinatura é cobrada. */
export type CicloCobranca = "mensal" | "anual";

export type Recurso =
  | "historico"
  | "pdf"
  | "metas"
  | "exportar"
  /** Digitar o que caiu e ver se bateu, e quanto faltou ou sobrou. */
  | "conferencia"
  /** As pistas de onde pode estar a diferença, linha por linha. */
  | "conferencia-detalhe"
  | "producao-ilimitada"
  /** Férias, 13º e rescisão com o salário e a média de extras da pessoa. */
  | "direitos"
  | "equipe";

export const DIAS_TESTE = 14;
/** Dias de tolerância depois do vencimento antes de voltar ao Grátis. */
export const DIAS_TOLERANCIA = 5;
/** Lançamentos de produção por período no plano Grátis. */
export const LIMITE_PRODUCAO_GRATIS = 20;

/** Pro anual: 12 meses pelo preço de 8. */
export const PRECO_ANUAL = 11900;
/** Turma: pessoas incluídas no valor fixo e preço de cada pessoa a mais. */
export const TURMA_INCLUIDOS = 5;
export const TURMA_POR_PESSOA = 690;

export interface DefinicaoPlano {
  nome: string;
  /** Preço mensal (Turma: valor fixo até `TURMA_INCLUIDOS` pessoas). */
  preco: number;
  /** Preço do ciclo anual, quando o plano tem. */
  precoAnual?: number;
  /** Ainda não está à venda: aparece como lista de espera. */
  emBreve?: boolean;
  /** Para quem é, em uma frase. */
  para: string;
  recursos: Recurso[];
  resumo: string[];
}

export const PLANOS: Record<Plano, DefinicaoPlano> = {
  gratis: {
    nome: "Grátis",
    preco: 0,
    para: "Para bater o ponto todo dia e saber quanto vai cair.",
    recursos: ["conferencia"],
    resumo: [
      "Ponto sem limite, mesmo sem internet",
      "Valor do mês e o passo a passo da conta",
      "Período atual e o anterior",
      "Conferir se o pagamento bateu e quanto faltou",
      "Seus dados guardados na sua conta",
      `Até ${LIMITE_PRODUCAO_GRATIS} lançamentos de produção por período`,
    ],
  },
  individual: {
    nome: "Pro",
    preco: 1490,
    precoAnual: PRECO_ANUAL,
    para: "Para achar o dinheiro que faltou e ter tudo guardado.",
    recursos: ["historico", "pdf", "metas", "exportar", "conferencia", "conferencia-detalhe", "producao-ilimitada", "direitos"],
    resumo: [
      "Tudo do Grátis",
      "Onde faltou no pagamento, linha por linha",
      "Histórico de todos os períodos",
      "Contracheque em PDF e planilha",
      "Férias, 13º e rescisão com os seus números",
      "Metas e produção sem limite",
    ],
  },
  equipe: {
    nome: "Turma",
    preco: 3990,
    emBreve: true,
    para: "Para empreiteiro e encarregado que pagam uma equipe.",
    recursos: ["historico", "pdf", "metas", "exportar", "conferencia", "conferencia-detalhe", "producao-ilimitada", "direitos", "equipe"],
    resumo: [
      "Pro para cada pessoa da turma",
      "Convite por link ou WhatsApp",
      "Aprovar ponto e produção de cada um",
      "Folha da turma em PDF e planilha",
      `${TURMA_INCLUIDOS} pessoas incluídas; R$ 6,90 por pessoa a mais`,
    ],
  },
};

/** Planos que dá para assinar hoje. */
export const PLANOS_A_VENDA = (Object.keys(PLANOS) as Plano[]).filter((p): p is Exclude<Plano, "gratis"> => p !== "gratis" && !PLANOS[p].emBreve);

export type StatusAssinatura = "ativa" | "atrasada" | "cancelada";

export interface Assinatura {
  plano: Exclude<Plano, "gratis">;
  status: StatusAssinatura;
  /** Ausente nas assinaturas antigas: mensal. */
  ciclo?: CicloCobranca;
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

/** Valor mensal da assinatura. Turma: valor fixo até 5 pessoas e mais um tanto por pessoa a partir da 6ª. */
export function valorMensal(plano: Exclude<Plano, "gratis">, trabalhadores = 1): number {
  const p = PLANOS[plano];
  return plano === "equipe" ? p.preco + Math.max(0, trabalhadores - TURMA_INCLUIDOS) * TURMA_POR_PESSOA : p.preco;
}

/** Valor de uma cobrança no ciclo escolhido. Plano sem preço anual cobra sempre por mês. */
export function valorDoCiclo(plano: Exclude<Plano, "gratis">, ciclo: CicloCobranca, trabalhadores = 1): number {
  const anual = PLANOS[plano].precoAnual;
  return ciclo === "anual" && anual ? anual : valorMensal(plano, trabalhadores);
}

/** Quanto se economiza no ano escolhendo o anual (0 se o plano não tem anual). */
export function economiaAnual(plano: Exclude<Plano, "gratis">): number {
  const anual = PLANOS[plano].precoAnual;
  return anual ? valorMensal(plano) * 12 - anual : 0;
}

/** Turma: mínimo e máximo de trabalhadores numa assinatura. */
export const TRABALHADORES_MIN = 2;
export const TRABALHADORES_MAX = 200;

/** Último dia coberto por uma cobrança que vence em `vencimento` (um mês ou um ano depois, menos um dia). */
export function pagoAteDoPagamento(vencimento: string, ciclo: CicloCobranca = "mensal"): string {
  const [a, m, d] = vencimento.split("-").map(Number) as [number, number, number];
  const ano = ciclo === "anual" ? a + 1 : m === 12 ? a + 1 : a;
  const mes = ciclo === "anual" ? m : m === 12 ? 1 : m + 1;
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
