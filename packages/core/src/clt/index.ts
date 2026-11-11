import { arredondar, formatarPercentual, formatarReais } from "../dinheiro";

/**
 * Folha CLT: INSS e IRRF por tabela oficial, com ano de vigência e fonte.
 * Valores em centavos; alíquotas em pontos-base (750 = 7,5%).
 * As tabelas mudam todo ano: acrescente o ano novo aqui (o motor usa a mais recente
 * com vigência até a data do período) e rode os testes.
 */

export interface FaixaInss {
  /** Teto da faixa (inclusive). */
  ate: number;
  aliquota: number;
}

export interface FaixaIrrf {
  ate: number;
  aliquota: number;
  deduzir: number;
}

export interface TabelaAno {
  ano: number;
  inss: { faixas: FaixaInss[]; fonte: string };
  irrf: {
    faixas: FaixaIrrf[];
    /** Desconto simplificado mensal (opcional ao contribuinte: vale o que der menos imposto). */
    descontoSimplificado: number;
    deducaoDependente: number;
    /** Redução mensal (Lei 15.270/2025): até `limiteIsencao` zera o imposto até `reducaoMaxima`;
     * entre o limite e `limiteReducao`, redução = a − b × rendimento. */
    reducao?: { limiteIsencao: number; reducaoMaxima: number; limiteReducao: number; a: number; b: number };
    fonte: string;
  };
}

export const TABELAS_CLT: TabelaAno[] = [
  {
    ano: 2026,
    inss: {
      faixas: [
        { ate: 162_100, aliquota: 750 },
        { ate: 290_284, aliquota: 900 },
        { ate: 435_427, aliquota: 1200 },
        { ate: 847_555, aliquota: 1400 },
      ],
      fonte: "Portaria Interministerial MPS/MF nº 13/2026 (teto R$ 8.475,55)",
    },
    irrf: {
      faixas: [
        { ate: 242_880, aliquota: 0, deduzir: 0 },
        { ate: 282_665, aliquota: 750, deduzir: 18_216 },
        { ate: 375_105, aliquota: 1500, deduzir: 39_416 },
        { ate: 466_468, aliquota: 2250, deduzir: 67_549 },
        { ate: Number.POSITIVE_INFINITY, aliquota: 2750, deduzir: 90_873 },
      ],
      descontoSimplificado: 60_720,
      deducaoDependente: 18_959,
      reducao: { limiteIsencao: 500_000, reducaoMaxima: 31_289, limiteReducao: 735_000, a: 97_862, b: 0.133145 },
      fonte: "Tabela progressiva mensal (Lei 15.191/2025) e redução da Lei 15.270/2025",
    },
  },
];

/** Tabela do ano (ou a mais recente anterior; se o ano for anterior a todas, a mais antiga). */
export function tabelaDoAno(ano: number): TabelaAno {
  const ordenadas = [...TABELAS_CLT].sort((a, b) => b.ano - a.ano);
  return ordenadas.find((t) => t.ano <= ano) ?? ordenadas[ordenadas.length - 1]!;
}

export interface ResultadoInss {
  valor: number;
  /** Uma linha por faixa usada: "R$ 1.621,00 × 7,5% = R$ 121,58" */
  passos: string[];
  noTeto: boolean;
}

/** INSS do empregado: alíquota de cada faixa só sobre a parte do salário naquela faixa. */
export function calcularInss(base: number, ano: number): ResultadoInss {
  const t = tabelaDoAno(ano).inss;
  const teto = t.faixas[t.faixas.length - 1]!.ate;
  const b = Math.max(0, Math.min(base, teto));
  let anterior = 0;
  let exato = 0;
  const passos: string[] = [];
  for (const f of t.faixas) {
    if (b <= anterior) break;
    const parte = Math.min(b, f.ate) - anterior;
    const v = (parte * f.aliquota) / 10_000;
    exato += v;
    passos.push(`${formatarReais(parte)} × ${formatarPercentual(f.aliquota / 100)} = ${formatarReais(arredondar(v))}`);
    anterior = f.ate;
  }
  return { valor: arredondar(exato), passos, noTeto: base >= teto };
}

export interface ResultadoIrrf {
  valor: number;
  base: number;
  /** "simplificado" ou "deducoes" (INSS + dependentes): o que der menos imposto. */
  modo: "simplificado" | "deducoes";
  impostoTabela: number;
  reducao: number;
  aliquota: number;
}

function impostoPelaTabela(base: number, faixas: FaixaIrrf[]): { imposto: number; aliquota: number } {
  const f = faixas.find((x) => base <= x.ate) ?? faixas[faixas.length - 1]!;
  return { imposto: Math.max(0, arredondar((base * f.aliquota) / 10_000 - f.deduzir)), aliquota: f.aliquota };
}

/**
 * IRRF mensal. `rendimento` = rendimentos tributáveis do mês (bruto, antes das deduções).
 * Compara deduções legais (INSS + dependentes) com o desconto simplificado e usa o menor imposto.
 * Depois aplica a redução da Lei 15.270/2025 sobre o rendimento tributável.
 */
export function calcularIrrf(rendimento: number, inss: number, dependentes: number, ano: number): ResultadoIrrf {
  const t = tabelaDoAno(ano).irrf;
  const baseDeducoes = Math.max(0, rendimento - inss - dependentes * t.deducaoDependente);
  const baseSimplificada = Math.max(0, rendimento - t.descontoSimplificado);
  const porDeducoes = impostoPelaTabela(baseDeducoes, t.faixas);
  const porSimplificado = impostoPelaTabela(baseSimplificada, t.faixas);
  const usaSimplificado = porSimplificado.imposto < porDeducoes.imposto;
  const escolhido = usaSimplificado ? porSimplificado : porDeducoes;
  let reducao = 0;
  if (t.reducao && escolhido.imposto > 0) {
    const r = t.reducao;
    if (rendimento <= r.limiteIsencao) reducao = Math.min(escolhido.imposto, r.reducaoMaxima);
    else if (rendimento <= r.limiteReducao) reducao = Math.min(escolhido.imposto, Math.max(0, arredondar(r.a - r.b * rendimento)));
  }
  return {
    valor: escolhido.imposto - reducao,
    base: usaSimplificado ? baseSimplificada : baseDeducoes,
    modo: usaSimplificado ? "simplificado" : "deducoes",
    impostoTabela: escolhido.imposto,
    reducao,
    aliquota: escolhido.aliquota,
  };
}

/** Folga remunerada (DSR) sobre hora extra: extras ÷ dias úteis × domingos e feriados. */
export function dsrSobreExtras(valorExtras: number, diasUteis: number, diasDescanso: number): number {
  if (valorExtras <= 0 || diasUteis <= 0 || diasDescanso <= 0) return 0;
  return arredondar((valorExtras * diasDescanso) / diasUteis);
}

/** Vale-transporte: até 6% do salário-base, nunca mais que o valor do benefício. */
export function descontoValeTransporte(salarioBase: number, percentual: number, valorBeneficio?: number): number {
  const v = arredondar((salarioBase * Math.round(percentual * 100)) / 10_000);
  return valorBeneficio !== undefined ? Math.min(v, valorBeneficio) : v;
}

/** Desconto em palavras, para listas e resumos. */
export function descreverDesconto(d: { tipo: string; valor?: number; dependentes?: number; percentual?: number }): string {
  switch (d.tipo) {
    case "percentual":
      return formatarPercentual(d.valor ?? 0);
    case "fixo":
      return formatarReais(d.valor ?? 0);
    case "inss":
      return "tabela oficial, por faixas";
    case "irrf":
      return d.dependentes ? `tabela oficial, ${d.dependentes} dependente(s)` : "tabela oficial";
    case "vale-transporte":
      return `${formatarPercentual(d.percentual ?? 6)} do salário-base`;
    default:
      return "";
  }
}
