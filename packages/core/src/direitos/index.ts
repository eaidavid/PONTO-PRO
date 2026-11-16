import { calcularInss, calcularIrrf } from "../clt";
import { arredondar, formatarReais } from "../dinheiro";
import { diasEntre, montarIso, somarDias, ultimoDiaDoMes } from "../tempo";

/**
 * Direitos do trabalhador CLT: salário líquido, férias, 13º e rescisão.
 * São ESTIMATIVAS com as regras gerais da CLT; acordo coletivo, médias de comissão
 * e casos especiais mudam o valor. Dinheiro em centavos.
 */

export interface LinhaDireito {
  descricao: string;
  /** A conta escrita: "R$ 3.000,00 ÷ 30 × 12 dias". */
  conta: string;
  valor: number;
  tipo: "ganho" | "desconto" | "info";
}

export interface ResultadoDireito {
  linhas: LinhaDireito[];
  bruto: number;
  descontos: number;
  liquido: number;
  avisos: string[];
}

function fechar(linhas: LinhaDireito[], avisos: string[] = []): ResultadoDireito {
  const bruto = linhas.filter((l) => l.tipo === "ganho").reduce((t, l) => t + l.valor, 0);
  const descontos = linhas.filter((l) => l.tipo === "desconto").reduce((t, l) => t + l.valor, 0);
  return { linhas, bruto, descontos, liquido: bruto - descontos, avisos };
}

/** INSS e IR de um valor tributável, como linhas de desconto. */
function impostos(rotulo: string, valor: number, dependentes: number, ano: number): LinhaDireito[] {
  if (valor <= 0) return [];
  const inss = calcularInss(valor, ano);
  const ir = calcularIrrf(valor, inss.valor, dependentes, ano);
  const linhas: LinhaDireito[] = [];
  if (inss.valor > 0) linhas.push({ descricao: `INSS${rotulo}`, conta: `Tabela progressiva sobre ${formatarReais(valor)}`, valor: inss.valor, tipo: "desconto" });
  if (ir.valor > 0) linhas.push({ descricao: `Imposto de renda${rotulo}`, conta: `Tabela do IR sobre ${formatarReais(ir.base)}`, valor: ir.valor, tipo: "desconto" });
  return linhas;
}

// ---------- salário líquido ----------

export function salarioLiquido(p: { salario: number; dependentes?: number; outrosDescontos?: number; ano: number }): ResultadoDireito {
  const linhas: LinhaDireito[] = [{ descricao: "Salário bruto", conta: formatarReais(p.salario), valor: p.salario, tipo: "ganho" }];
  linhas.push(...impostos("", p.salario, p.dependentes ?? 0, p.ano));
  if (p.outrosDescontos && p.outrosDescontos > 0) linhas.push({ descricao: "Outros descontos", conta: formatarReais(p.outrosDescontos), valor: p.outrosDescontos, tipo: "desconto" });
  return fechar(linhas);
}

// ---------- férias ----------

export interface EntradaFerias {
  salario: number;
  /** Média mensal de hora extra, adicionais e comissões dos últimos 12 meses. */
  mediaVariaveis?: number;
  /** Dias de férias de direito (30 para quem não teve mais de 5 faltas). */
  dias?: number;
  /** Vender 10 dias (abono pecuniário). */
  venderDias?: boolean;
  dependentes?: number;
  ano: number;
}

export function ferias(p: EntradaFerias): ResultadoDireito {
  const base = p.salario + (p.mediaVariaveis ?? 0);
  const dias = Math.max(1, Math.min(30, p.dias ?? 30));
  const vendidos = p.venderDias ? Math.floor(dias / 3) : 0;
  const gozo = dias - vendidos;
  const valorFerias = arredondar((base / 30) * gozo);
  const terco = arredondar(valorFerias / 3);
  const linhas: LinhaDireito[] = [
    { descricao: `Férias (${gozo} dias)`, conta: `${formatarReais(base)} ÷ 30 × ${gozo} dias`, valor: valorFerias, tipo: "ganho" },
    { descricao: "1/3 de férias", conta: `${formatarReais(valorFerias)} ÷ 3`, valor: terco, tipo: "ganho" },
  ];
  if (vendidos) {
    const abono = arredondar((base / 30) * vendidos);
    linhas.push({ descricao: `Venda de ${vendidos} dias (abono)`, conta: `${formatarReais(base)} ÷ 30 × ${vendidos} dias, sem INSS e sem IR`, valor: abono, tipo: "ganho" });
    linhas.push({ descricao: "1/3 sobre a venda", conta: `${formatarReais(abono)} ÷ 3`, valor: arredondar(abono / 3), tipo: "ganho" });
  }
  linhas.push(...impostos(" das férias", valorFerias + terco, p.dependentes ?? 0, p.ano));
  return fechar(linhas, ["O pagamento das férias cai até 2 dias antes de você sair de férias."]);
}

// ---------- 13º ----------

export interface EntradaDecimo {
  salario: number;
  mediaVariaveis?: number;
  /** Meses trabalhados no ano (mês com 15 dias ou mais conta inteiro). */
  meses: number;
  dependentes?: number;
  ano: number;
}

export function decimoTerceiro(p: EntradaDecimo): ResultadoDireito & { primeiraParcela: number; segundaParcela: number } {
  const base = p.salario + (p.mediaVariaveis ?? 0);
  const meses = Math.max(0, Math.min(12, Math.round(p.meses)));
  const bruto = arredondar((base * meses) / 12);
  const linhas: LinhaDireito[] = [{ descricao: `13º salário (${meses}/12)`, conta: `${formatarReais(base)} × ${meses} ÷ 12`, valor: bruto, tipo: "ganho" }];
  linhas.push(...impostos(" do 13º", bruto, p.dependentes ?? 0, p.ano));
  const r = fechar(linhas, ["A 1ª parcela, sem descontos, cai até 30 de novembro. A 2ª, com INSS e IR, até 20 de dezembro."]);
  const primeiraParcela = arredondar(bruto / 2);
  return { ...r, primeiraParcela, segundaParcela: r.liquido - primeiraParcela };
}

// ---------- contagem de meses ----------

/** Soma meses a uma data, segurando no último dia do mês (31/01 + 1 mês = 28/02). */
export function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const total = a * 12 + (m - 1) + meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return montarIso(ano, mes, Math.min(d, ultimoDiaDoMes(ano, mes)));
}

/** Meses de 13º no ano de `fim`: cada mês do calendário com 15 dias ou mais trabalhados conta. */
export function mesesDeDecimo(inicio: string, fim: string): number {
  const ano = Number(fim.slice(0, 4));
  let meses = 0;
  for (let m = 1; m <= 12; m++) {
    const de = montarIso(ano, m, 1);
    const ate = montarIso(ano, m, ultimoDiaDoMes(ano, m));
    const a = inicio > de ? inicio : de;
    const b = fim < ate ? fim : ate;
    if (b >= a && diasEntre(a, b) + 1 >= 15) meses++;
  }
  return meses;
}

/** Meses de férias proporcionais: do último aniversário da admissão até `fim`; sobra de 15 dias conta um mês. */
export function mesesDeFerias(admissao: string, fim: string): number {
  let inicio = admissao;
  while (somarMeses(inicio, 12) <= fim) inicio = somarMeses(inicio, 12);
  let meses = 0;
  while (meses < 12 && somarMeses(inicio, meses + 1) <= somarDias(fim, 1)) meses++;
  const resto = diasEntre(somarMeses(inicio, meses), fim) + 1;
  return Math.min(12, meses + (meses < 12 && resto >= 15 ? 1 : 0));
}

/** Anos completos entre a admissão e a saída. */
export function anosCompletos(admissao: string, saida: string): number {
  let anos = 0;
  while (somarMeses(admissao, (anos + 1) * 12) <= saida) anos++;
  return anos;
}

// ---------- rescisão ----------

export type MotivoSaida = "sem-justa-causa" | "pedido" | "acordo" | "justa-causa";

export const NOME_MOTIVO: Record<MotivoSaida, string> = {
  "sem-justa-causa": "Demitido sem justa causa",
  pedido: "Pedi demissão",
  acordo: "Acordo com a empresa",
  "justa-causa": "Demitido por justa causa",
};

export interface EntradaRescisao {
  salario: number;
  mediaVariaveis?: number;
  admissao: string;
  /** Último dia de trabalho. */
  saida: string;
  motivo: MotivoSaida;
  /** Demitido sem justa causa ou acordo: o aviso foi pago sem trabalhar (indenizado)? Pedido: cumpriu o aviso? */
  avisoTrabalhado?: boolean;
  /** Períodos de férias vencidas e não tiradas (0, 1 ou 2). */
  feriasVencidas?: number;
  /** Saldo do FGTS, se souber. Sem ele, estimamos 8% ao mês. */
  saldoFgts?: number;
  dependentes?: number;
}

export function rescisao(p: EntradaRescisao): ResultadoDireito & { diasAviso: number; fgts: { saldo: number; multa: number; saque: number } } {
  const base = p.salario + (p.mediaVariaveis ?? 0);
  const ano = Number(p.saida.slice(0, 4));
  const anos = anosCompletos(p.admissao, p.saida);
  const linhas: LinhaDireito[] = [];
  const avisos: string[] = [];
  const justa = p.motivo === "justa-causa";

  // saldo de salário: dias trabalhados no mês da saída
  const diaSaida = Number(p.saida.slice(8, 10));
  const inicioMes = p.admissao.slice(0, 7) === p.saida.slice(0, 7) ? Number(p.admissao.slice(8, 10)) : 1;
  const diasSaldo = Math.min(30, diaSaida - inicioMes + 1);
  const saldo = arredondar((base / 30) * diasSaldo);
  linhas.push({ descricao: `Saldo de salário (${diasSaldo} dias)`, conta: `${formatarReais(base)} ÷ 30 × ${diasSaldo} dias`, valor: saldo, tipo: "ganho" });

  // aviso prévio: 30 dias + 3 por ano completo, até 90
  const diasAvisoCheio = Math.min(90, 30 + 3 * anos);
  let diasAviso = 0;
  if (p.motivo === "sem-justa-causa" && !p.avisoTrabalhado) diasAviso = diasAvisoCheio;
  if (p.motivo === "acordo" && !p.avisoTrabalhado) diasAviso = Math.floor(diasAvisoCheio / 2);
  if (diasAviso) {
    const v = arredondar((base / 30) * diasAviso);
    linhas.push({ descricao: `Aviso prévio indenizado (${diasAviso} dias)`, conta: `${formatarReais(base)} ÷ 30 × ${diasAviso} dias${p.motivo === "acordo" ? " (metade, no acordo)" : ""}`, valor: v, tipo: "ganho" });
  }
  if (p.motivo === "pedido" && p.avisoTrabalhado === false) {
    linhas.push({ descricao: "Desconto do aviso não cumprido", conta: `${formatarReais(base)} (30 dias)`, valor: base, tipo: "desconto" });
  }

  // o aviso indenizado conta como tempo de serviço para 13º e férias
  const projetada = somarDias(p.saida, diasAviso);

  let decimo = 0;
  if (!justa) {
    const meses = mesesDeDecimo(p.admissao, projetada > `${ano}-12-31` ? `${ano}-12-31` : projetada);
    decimo = arredondar((base * meses) / 12);
    if (decimo) linhas.push({ descricao: `13º proporcional (${meses}/12)`, conta: `${formatarReais(base)} × ${meses} ÷ 12`, valor: decimo, tipo: "ganho" });
  }

  const vencidas = Math.max(0, Math.min(2, p.feriasVencidas ?? 0));
  if (vencidas) {
    const v = base * vencidas;
    linhas.push({ descricao: vencidas === 1 ? "Férias vencidas" : `Férias vencidas (${vencidas} períodos)`, conta: `${formatarReais(base)} × ${vencidas}`, valor: v, tipo: "ganho" });
    linhas.push({ descricao: "1/3 das férias vencidas", conta: `${formatarReais(v)} ÷ 3`, valor: arredondar(v / 3), tipo: "ganho" });
  }
  if (!justa) {
    const meses = mesesDeFerias(p.admissao, projetada);
    const v = arredondar((base * meses) / 12);
    if (v) {
      linhas.push({ descricao: `Férias proporcionais (${meses}/12)`, conta: `${formatarReais(base)} × ${meses} ÷ 12`, valor: v, tipo: "ganho" });
      linhas.push({ descricao: "1/3 das férias proporcionais", conta: `${formatarReais(v)} ÷ 3`, valor: arredondar(v / 3), tipo: "ganho" });
    }
  }

  // descontos: INSS e IR só sobre saldo de salário e 13º (aviso e férias indenizadas são isentos)
  linhas.push(...impostos(" do salário", saldo, p.dependentes ?? 0, ano));
  linhas.push(...impostos(" do 13º", decimo, p.dependentes ?? 0, ano));

  // FGTS: fica na conta do FGTS, não entra no valor da rescisão
  const meses = Math.max(1, Math.round(diasEntre(p.admissao, p.saida) / 30.44));
  const saldoFgts = p.saldoFgts ?? arredondar(base * 0.08 * meses);
  const pctMulta = p.motivo === "sem-justa-causa" ? 40 : p.motivo === "acordo" ? 20 : 0;
  const multa = arredondar((saldoFgts * pctMulta) / 100);
  const pctSaque = p.motivo === "sem-justa-causa" ? 100 : p.motivo === "acordo" ? 80 : 0;
  const saque = arredondar((saldoFgts * pctSaque) / 100) + multa;
  linhas.push({ descricao: p.saldoFgts === undefined ? "Saldo do FGTS (estimado)" : "Saldo do FGTS", conta: p.saldoFgts === undefined ? `8% de ${formatarReais(base)} × ${meses} meses` : "Informado por você", valor: saldoFgts, tipo: "info" });
  if (multa) linhas.push({ descricao: `Multa do FGTS (${pctMulta}%)`, conta: `${formatarReais(saldoFgts)} × ${pctMulta}%`, valor: multa, tipo: "info" });

  if (p.motivo === "sem-justa-causa") avisos.push("Você pode ter direito ao seguro-desemprego. Confira no app Carteira de Trabalho Digital.");
  if (p.motivo === "acordo") avisos.push("No acordo, você saca 80% do FGTS e não tem seguro-desemprego.");
  if (p.motivo === "pedido" || justa) avisos.push("Nesse tipo de saída o FGTS fica na conta e não dá para sacar agora.");
  avisos.push("A empresa tem até 10 dias depois do último dia para pagar a rescisão.");

  return { ...fechar(linhas, avisos), diasAviso, fgts: { saldo: saldoFgts, multa, saque } };
}
