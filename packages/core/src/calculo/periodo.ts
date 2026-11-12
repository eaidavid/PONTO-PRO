import type { Periodo } from "../ciclo";
import { datasDoPeriodo, rotuloPeriodo } from "../ciclo";
import {
  aplicarPercentual,
  formatarPercentual,
  formatarQuantidade,
  formatarReais,
  type Tarifa,
  valorAdicional,
  valorHoraDaTarifa,
  valorMinutos,
  valorProducao,
} from "../dinheiro";
import { calcularInss, calcularIrrf, descontoValeTransporte, dsrSobreExtras, tabelaDoAno } from "../clt";
import { escalaDoDia } from "../escala";
import { feriadosDoIntervalo } from "../feriados";
import { rotuloUnidade } from "../producao";
import type { PerfilTrabalho } from "../schema/perfil";
import type { ItemProducao, LancamentoProducao } from "../schema/producao";
import type { DiaRegistro, Feriado } from "../schema/registro";
import { type Agora, diaDaSemana, formatarDuracao, formatarHorasCurto, inicioDaSemana } from "../tempo";
import { analisarDia, type CategoriaDia, type DiaAnalise } from "./dia";

export type TipoLinha =
  | "salario"
  | "normal"
  | "diaria"
  | "abono"
  | "extra"
  | "adicional"
  | "producao"
  | "desconto";

/** Uma linha de ganho ou desconto, já com a conta escrita por extenso. */
export interface Linha {
  codigo: string;
  descricao: string;
  /** Referência do contracheque: "198h00", "50 m", "9%". */
  referencia: string;
  /** Centavos. Descontos são positivos (o tipo diz que é desconto). */
  valor: number;
  tipo: TipoLinha;
  /** "Sábado 5h × R$ 25,00 + 50% = R$ 187,50" */
  conta: string;
  /** Explicação curta para quem toca no termo. */
  explicacao: string;
}

export interface Aviso {
  id: "descontos-maiores" | "dia-incompleto" | "saldo-acima-limite" | "sem-valor";
  texto: string;
}

export interface DiaResultado extends DiaAnalise {
  /** Hora extra paga ou mandada para o saldo neste dia. */
  extraMin: number;
  /** Excedente que cobriu horas a menos de outro dia da semana. */
  compensadoMin: number;
}

export interface ResultadoPeriodo {
  periodo: Periodo;
  dias: DiaResultado[];
  ganhos: Linha[];
  descontos: Linha[];
  bruto: number;
  totalDescontos: number;
  liquido: number;
  horas: {
    trabalhadoMin: number;
    normalMin: number;
    extraMin: number;
    abonoMin: number;
    deficitMin: number;
    noturnoMin: number;
  };
  /** Saldo de horas (banco). Zero quando desligado. */
  saldoBancoMin: number;
  avisos: Aviso[];
  /** Valor de uma hora normal (para frases e simulações). */
  valorHora: number;
  tarifa: Tarifa | null;
}

export interface EntradaPeriodo {
  perfil: PerfilTrabalho;
  periodo: Periodo;
  registros?: DiaRegistro[];
  feriadosLocais?: Feriado[];
  itens?: ItemProducao[];
  lancamentos?: LancamentoProducao[];
  /** Dia e hora de agora: fecha o intervalo em aberto de hoje. */
  agora?: Agora;
  /**
   * "periodo": contracheque do período (salário mensal inteiro, com descontos).
   * "dia": ganho bruto de um dia (salário mensal vira horas × valor da hora).
   */
  modo?: "periodo" | "dia";
  /** Salário mensal proporcional às horas previstas até esta data ("Já ganhou"). */
  proporcionalAte?: string;
}

const NOME_CATEGORIA: Record<CategoriaDia, string> = {
  util: "dia útil",
  sabado: "sábado",
  domingo: "domingo",
  feriado: "feriado",
};

const EXPLICA = {
  salario: "Seu salário fixo do mês.",
  normal: "Horas dentro da sua semana, pelo valor da hora.",
  diaria: "Cada dia trabalhado vale uma diária.",
  abonoFeriado: "Feriado em dia de trabalho: você recebe as horas do dia mesmo sem trabalhar.",
  abonoAtestado: "Dia com atestado: as horas do dia são pagas.",
  extra: "Horas além da sua semana, com o percentual a mais que você escolheu.",
  noturno: "Valor a mais pelas horas trabalhadas à noite.",
  reduzida: "À noite, cada hora conta como 52 minutos e 30 segundos. A diferença é paga aqui.",
  producao: "Serviço lançado × preço por unidade.",
  faltas: "Horas que faltaram para completar sua semana.",
  desconto: "Desconto que você cadastrou em Ajustes.",
} as const;

/** Tarifa (centavos por minuto) da forma de pagamento. Null para só produção. */
export function tarifaDoPerfil(perfil: PerfilTrabalho): Tarifa | null {
  const p = perfil.pagamento;
  const base = p.forma === "misto" ? p.base : p.forma;
  switch (base) {
    case "hora":
      return { num: (p as { valorHora: number }).valorHora, den: 60 };
    case "diaria": {
      const d = p as { valorDiaria: number; horasDiariaMin: number };
      return { num: d.valorDiaria, den: d.horasDiariaMin };
    }
    case "mensal": {
      const m = p as { salario: number; divisorHoras: number };
      return { num: m.salario, den: m.divisorHoras * 60 };
    }
    default:
      return null;
  }
}

function baseDoPagamento(perfil: PerfilTrabalho): "hora" | "diaria" | "mensal" | "producao" {
  const p = perfil.pagamento;
  return p.forma === "misto" ? p.base : p.forma;
}

function pctDaCategoria(perfil: PerfilTrabalho, c: CategoriaDia): number {
  const a = perfil.adicionais;
  return { util: a.extraDiaUtil, sabado: a.extraSabado, domingo: a.extraDomingo, feriado: a.extraFeriado }[c];
}

export function calcularPeriodo(e: EntradaPeriodo): ResultadoPeriodo {
  const { perfil, periodo } = e;
  const modo = e.modo ?? "periodo";
  const regs = new Map((e.registros ?? []).map((r) => [r.data, r]));
  const feriados = feriadosDoIntervalo(periodo.inicio, periodo.fim, e.feriadosLocais);
  const datas = datasDoPeriodo(periodo);

  // 1) cada dia
  const dias: DiaResultado[] = datas.map((data) => {
    const agoraMin = e.agora && e.agora.data === data ? e.agora.minutos : undefined;
    const a = analisarDia(perfil, data, regs.get(data), feriados.get(data), { agoraMin });
    // "Já ganhou": feriado ou atestado que ainda não chegou não conta como pago
    if (e.proporcionalAte && data > e.proporcionalAte && a.abonoMin > 0) {
      a.abonoMin = 0;
      delete a.motivoAbono;
    }
    return { ...a, extraMin: 0, compensadoMin: 0 };
  });

  // 2) semana: compensação e limite semanal
  const extraPorCategoria: Record<CategoriaDia, number> = { util: 0, sabado: 0, domingo: 0, feriado: 0 };
  let normalTotal = 0;
  let deficitResidual = 0;
  const semanas = new Map<string, DiaResultado[]>();
  for (const d of dias) {
    const k = inicioDaSemana(d.data);
    if (!semanas.has(k)) semanas.set(k, []);
    semanas.get(k)!.push(d);
  }
  const compensa = perfil.jornada.compensacaoSemanal && modo === "periodo";
  for (const semana of semanas.values()) {
    const deficit = semana.reduce((t, d) => t + d.deficitMin, 0);
    let paraCompensar = compensa ? deficit : 0;
    let normalSemana = 0;
    for (const d of semana) {
      const usado = Math.min(d.excedenteMin, paraCompensar);
      paraCompensar -= usado;
      d.compensadoMin = usado;
      d.extraMin = d.excedenteMin - usado + d.acimaLimiteMin + d.foraEscalaMin;
      normalSemana += d.normalMin + usado;
      extraPorCategoria[d.categoria] += d.extraMin;
    }
    const compensado = compensa ? deficit - paraCompensar : 0;
    deficitResidual += deficit - compensado;
    const limite = perfil.jornada.limiteSemanalMin;
    if (limite > 0 && normalSemana > limite) {
      const sobra = normalSemana - limite;
      normalSemana = limite;
      extraPorCategoria.util += sobra;
      semana[semana.length - 1]!.extraMin += sobra;
    }
    normalTotal += normalSemana;
  }

  // 3) saldo de horas (banco)
  const banco = perfil.bancoHoras;
  let saldoBancoMin = 0;
  const extraPaga = { ...extraPorCategoria };
  if (banco.ativo) {
    const vaiProBanco: CategoriaDia[] = banco.pagaDomingoFeriado
      ? ["util", "sabado"]
      : ["util", "sabado", "domingo", "feriado"];
    for (const c of vaiProBanco) {
      saldoBancoMin += extraPaga[c];
      extraPaga[c] = 0;
    }
    saldoBancoMin -= deficitResidual;
    saldoBancoMin -= dias.reduce((t, d) => t + d.debitoBancoMin, 0);
  }

  // 4) ganhos
  const tarifa = tarifaDoPerfil(perfil);
  const base = baseDoPagamento(perfil);
  const vh = tarifa ? valorHoraDaTarifa(tarifa) : 0;
  const vhTxt = formatarReais(vh);
  const ganhos: Linha[] = [];
  const abonoFeriado = dias.filter((d) => d.motivoAbono === "feriado");
  const abonoAtestado = dias.filter((d) => d.motivoAbono === "atestado");
  const somaAbono = (l: DiaResultado[]) => l.reduce((t, d) => t + d.abonoMin, 0);

  if (tarifa && base === "mensal" && modo === "periodo") {
    let valor = (perfil.pagamento as { salario: number }).salario;
    let referencia = "mês";
    let conta = `Salário do mês = ${formatarReais(valor)}`;
    if (e.proporcionalAte) {
      const prevTotal = datas.reduce((t, d) => t + escalaDoDia(perfil.escala, d).horasLiquidasMin, 0);
      const prevAte = datas
        .filter((d) => d <= e.proporcionalAte!)
        .reduce((t, d) => t + escalaDoDia(perfil.escala, d).horasLiquidasMin, 0);
      if (prevTotal > 0) {
        const total = valor;
        valor = Math.round((total * prevAte) / prevTotal);
        referencia = `${formatarHorasCurto(prevAte)} de ${formatarHorasCurto(prevTotal)}`;
        conta = `Salário ${formatarReais(total)} × ${formatarHorasCurto(prevAte)} de ${formatarHorasCurto(prevTotal)} previstas = ${formatarReais(valor)}`;
      }
    }
    ganhos.push({ codigo: "001", descricao: "Salário", referencia, valor, tipo: "salario", conta, explicacao: EXPLICA.salario });
  } else if (tarifa && (base === "hora" || base === "mensal")) {
    if (normalTotal > 0) {
      const valor = valorMinutos(normalTotal, tarifa);
      ganhos.push({
        codigo: "002",
        descricao: "Horas normais",
        referencia: formatarDuracao(normalTotal),
        valor,
        tipo: "normal",
        conta: `Horas normais ${formatarHorasCurto(normalTotal)} × ${vhTxt} = ${formatarReais(valor)}`,
        explicacao: EXPLICA.normal,
      });
    }
  } else if (tarifa && base === "diaria") {
    const n = dias.filter((d) => d.normalMin > 0).length;
    if (n > 0) {
      const vd = (perfil.pagamento as { valorDiaria: number }).valorDiaria;
      const valor = n * vd;
      ganhos.push({
        codigo: "003",
        descricao: "Diárias",
        referencia: `${n} ${n === 1 ? "dia" : "dias"}`,
        valor,
        tipo: "diaria",
        conta: `Diárias ${n} × ${formatarReais(vd)} = ${formatarReais(valor)}`,
        explicacao: EXPLICA.diaria,
      });
    }
  }

  // abonos (no salário mensal já estão incluídos)
  const pagaAbono = tarifa && !(base === "mensal" && modo === "periodo");
  const linhaAbono = (lista: DiaResultado[], codigo: string, nome: string, explicacao: string) => {
    if (!pagaAbono || lista.length === 0) return;
    if (base === "diaria") {
      const vd = (perfil.pagamento as { valorDiaria: number }).valorDiaria;
      const valor = lista.length * vd;
      ganhos.push({
        codigo, descricao: nome, referencia: `${lista.length} ${lista.length === 1 ? "dia" : "dias"}`, valor, tipo: "abono",
        conta: `${nome} ${lista.length} × ${formatarReais(vd)} = ${formatarReais(valor)}`, explicacao,
      });
      return;
    }
    const min = somaAbono(lista);
    const valor = valorMinutos(min, tarifa!);
    ganhos.push({
      codigo, descricao: nome, referencia: formatarDuracao(min), valor, tipo: "abono",
      conta: `${nome} ${formatarHorasCurto(min)} × ${vhTxt} = ${formatarReais(valor)}`, explicacao,
    });
  };
  linhaAbono(abonoFeriado, "010", "Feriado (dia pago)", EXPLICA.abonoFeriado);
  linhaAbono(abonoAtestado, "011", "Atestado (dia pago)", EXPLICA.abonoAtestado);

  // horas extras por tipo de dia
  if (tarifa) {
    const codigos: Record<CategoriaDia, string> = { util: "020", sabado: "021", domingo: "022", feriado: "023" };
    for (const c of ["util", "sabado", "domingo", "feriado"] as CategoriaDia[]) {
      const min = extraPaga[c];
      if (min <= 0) continue;
      const pct = pctDaCategoria(perfil, c);
      const valor = valorMinutos(min, tarifa, pct);
      const nome = `Hora extra ${NOME_CATEGORIA[c]} ${formatarPercentual(pct)}`;
      const rotulo = c === "util" ? "Dia útil" : NOME_CATEGORIA[c][0]!.toUpperCase() + NOME_CATEGORIA[c].slice(1);
      ganhos.push({
        codigo: codigos[c],
        descricao: nome,
        referencia: formatarDuracao(min),
        valor,
        tipo: "extra",
        conta: `${rotulo} ${formatarHorasCurto(min)} × ${vhTxt} + ${formatarPercentual(pct)} = ${formatarReais(valor)}`,
        explicacao: EXPLICA.extra,
      });
    }
  }

  // adicional noturno
  const noturno = perfil.adicionais.noturno;
  const noturnoMin = dias.reduce((t, d) => t + d.noturnoMin, 0);
  if (tarifa && noturno.ativo && noturnoMin > 0) {
    const valor = valorAdicional(noturnoMin, tarifa, noturno.percentual);
    ganhos.push({
      codigo: "030",
      descricao: `Adicional noturno ${formatarPercentual(noturno.percentual)}`,
      referencia: formatarDuracao(noturnoMin),
      valor,
      tipo: "adicional",
      conta: `Noite ${formatarHorasCurto(noturnoMin)} × ${vhTxt} × ${formatarPercentual(noturno.percentual)} = ${formatarReais(valor)}`,
      explicacao: EXPLICA.noturno,
    });
    if (noturno.horaReduzida) {
      const bonus = Math.round((noturnoMin * 60) / 52.5) - noturnoMin;
      const v = valorMinutos(bonus, tarifa);
      ganhos.push({
        codigo: "031",
        descricao: "Hora noturna reduzida",
        referencia: formatarDuracao(bonus),
        valor: v,
        tipo: "adicional",
        conta: `Diferença da hora noturna ${formatarHorasCurto(bonus)} × ${vhTxt} = ${formatarReais(v)}`,
        explicacao: EXPLICA.reduzida,
      });
    }
  }

  // produção
  const usaProducao = perfil.producao.ativo || base === "producao" || perfil.pagamento.forma === "misto";
  if (usaProducao && e.lancamentos?.length) {
    const itens = new Map((e.itens ?? []).map((i) => [i.id, i]));
    const grupos = new Map<string, { item?: ItemProducao; nome: string; unidade: string; preco: number; qtd: number; valor: number }>();
    for (const l of e.lancamentos) {
      if (l.data < periodo.inicio || l.data > periodo.fim) continue;
      const item = itens.get(l.itemId);
      const k = `${l.itemId}|${l.precoUnitario}`;
      const g = grupos.get(k) ?? { item, nome: item?.nome ?? "Serviço", unidade: item?.unidade ?? "un", preco: l.precoUnitario, qtd: 0, valor: 0 };
      g.qtd += l.quantidade;
      g.valor += valorProducao(l.quantidade, l.precoUnitario);
      grupos.set(k, g);
    }
    let i = 0;
    for (const g of grupos.values()) {
      const un = rotuloUnidade(g.unidade);
      const qtd = `${formatarQuantidade(g.qtd)} ${un}`;
      ganhos.push({
        codigo: String(40 + i++).padStart(3, "0"),
        descricao: g.nome,
        referencia: qtd,
        valor: g.valor,
        tipo: "producao",
        conta: `${g.nome} ${qtd} × ${formatarReais(g.preco)} = ${formatarReais(g.valor)}`,
        explicacao: EXPLICA.producao,
      });
    }
  }

  // folga remunerada (DSR) sobre hora extra, quando ligada
  if (perfil.clt?.dsrSobreExtras && modo === "periodo") {
    const extras = ganhos.filter((l) => l.tipo === "extra").reduce((t, l) => t + l.valor, 0);
    const descanso = datas.filter((d) => diaDaSemana(d) === 0 || feriados.has(d)).length;
    const uteis = datas.length - descanso;
    const valor = dsrSobreExtras(extras, uteis, descanso);
    if (valor > 0) {
      ganhos.push({
        codigo: "024",
        descricao: "Folga remunerada sobre hora extra (DSR)",
        referencia: `${descanso} de ${uteis} dias`,
        valor,
        tipo: "extra",
        conta: `Hora extra ${formatarReais(extras)} ÷ ${uteis} dias úteis × ${descanso} domingos e feriados = ${formatarReais(valor)}`,
        explicacao: "Quem faz hora extra também recebe um pouco a mais pelos domingos e feriados do período.",
      });
    }
  }

  const bruto = ganhos.reduce((t, l) => t + l.valor, 0);

  // 5) descontos
  const descontos: Linha[] = [];
  if (modo === "periodo") {
    if (tarifa && base === "mensal" && !banco.ativo && deficitResidual > 0) {
      const valor = valorMinutos(deficitResidual, tarifa);
      descontos.push({
        codigo: "101",
        descricao: "Faltas e atrasos",
        referencia: formatarDuracao(deficitResidual),
        valor,
        tipo: "desconto",
        conta: `Faltas e atrasos ${formatarHorasCurto(deficitResidual)} × ${vhTxt} = −${formatarReais(valor)}`,
        explicacao: EXPLICA.faltas,
      });
    }
    const baseDesc = Math.max(0, bruto - descontos.reduce((t, l) => t + l.valor, 0));
    const ano = Number(periodo.fim.slice(0, 4));
    const salarioBase = Math.max(
      0,
      ganhos.filter((l) => l.tipo === "salario" || l.tipo === "normal" || l.tipo === "diaria").reduce((t, l) => t + l.valor, 0) -
        descontos.reduce((t, l) => t + l.valor, 0),
    );
    // INSS primeiro: o imposto de renda usa o INSS como dedução
    const temInss = perfil.descontos.some((d) => d.tipo === "inss");
    const inss = temInss ? calcularInss(baseDesc, ano) : null;
    perfil.descontos.forEach((d, i) => {
      const codigo = String(110 + i);
      switch (d.tipo) {
        case "percentual": {
          const valor = aplicarPercentual(baseDesc, d.valor);
          descontos.push({
            codigo, descricao: d.nome, referencia: formatarPercentual(d.valor), valor, tipo: "desconto",
            conta: `${d.nome} ${formatarPercentual(d.valor)} de ${formatarReais(baseDesc)} = −${formatarReais(valor)}`,
            explicacao: EXPLICA.desconto,
          });
          break;
        }
        case "fixo":
          descontos.push({
            codigo, descricao: d.nome, referencia: "valor fixo", valor: d.valor, tipo: "desconto",
            conta: `${d.nome} (valor fixo) = −${formatarReais(d.valor)}`, explicacao: EXPLICA.desconto,
          });
          break;
        case "inss":
          descontos.push({
            codigo: "120",
            descricao: d.nome,
            referencia: `tabela ${tabelaDoAno(ano).ano}`,
            valor: inss!.valor,
            tipo: "desconto",
            conta: `${d.nome} sobre ${formatarReais(baseDesc)}, por faixas: ${inss!.passos.join(" + ")} = −${formatarReais(inss!.valor)}${inss!.noTeto ? " (no teto)" : ""}`,
            explicacao: `Cada faixa do salário paga uma porcentagem. ${tabelaDoAno(ano).inss.fonte}.`,
          });
          break;
        case "irrf": {
          const ir = calcularIrrf(baseDesc, inss?.valor ?? 0, d.dependentes, ano);
          const modo = ir.modo === "simplificado" ? "com o desconto simplificado" : `descontando INSS${d.dependentes ? ` e ${d.dependentes} dependente(s)` : ""}`;
          descontos.push({
            codigo: "121",
            descricao: d.nome,
            referencia: ir.aliquota ? formatarPercentual(ir.aliquota / 100) : "isento",
            valor: ir.valor,
            tipo: "desconto",
            conta:
              ir.impostoTabela === 0
                ? `${d.nome}: base ${formatarReais(ir.base)} (${modo}) fica na faixa isenta = R$ 0,00`
                : `${d.nome}: base ${formatarReais(ir.base)} (${modo}) dá ${formatarReais(ir.impostoTabela)}${ir.reducao ? `, menos a redução de ${formatarReais(ir.reducao)}` : ""} = −${formatarReais(ir.valor)}`,
            explicacao: `Imposto pela tabela do mês, com a regra que der menos imposto. ${tabelaDoAno(ano).irrf.fonte}.`,
          });
          break;
        }
        case "vale-transporte": {
          const valor = descontoValeTransporte(salarioBase, d.percentual, d.valorBeneficio);
          descontos.push({
            codigo: "122",
            descricao: d.nome,
            referencia: formatarPercentual(d.percentual),
            valor,
            tipo: "desconto",
            conta: `${d.nome} ${formatarPercentual(d.percentual)} do salário-base ${formatarReais(salarioBase)}${d.valorBeneficio !== undefined ? ` (limite ${formatarReais(d.valorBeneficio)})` : ""} = −${formatarReais(valor)}`,
            explicacao: "A empresa pode descontar até 6% do salário-base, nunca mais do que o valor do vale.",
          });
          break;
        }
      }
    });
  }
  const totalDescontos = descontos.reduce((t, l) => t + l.valor, 0);

  // 6) avisos
  const avisos: Aviso[] = [];
  if (totalDescontos > bruto && totalDescontos > 0) {
    avisos.push({
      id: "descontos-maiores",
      texto: "Os descontos estão maiores que o que você ganhou neste período. Confira em Ajustes.",
    });
  }
  if (dias.some((d) => d.incompleto)) {
    avisos.push({ id: "dia-incompleto", texto: "Tem dia sem a saída marcada. Confira em Registros." });
  }
  if (banco.ativo && banco.limiteMin !== undefined && saldoBancoMin > banco.limiteMin) {
    avisos.push({ id: "saldo-acima-limite", texto: "Seu saldo de horas passou do limite combinado. Converse com quem paga." });
  }
  if (!tarifa && !e.lancamentos?.length) {
    avisos.push({ id: "sem-valor", texto: "Nenhum serviço lançado ainda neste período." });
  }

  const extraMin = Object.values(extraPorCategoria).reduce((t, v) => t + v, 0);
  return {
    periodo,
    dias,
    ganhos,
    descontos,
    bruto,
    totalDescontos,
    liquido: bruto - totalDescontos,
    horas: {
      trabalhadoMin: dias.reduce((t, d) => t + d.trabalhadoMin, 0),
      normalMin: normalTotal,
      extraMin,
      abonoMin: somaAbono(dias),
      deficitMin: deficitResidual,
      noturnoMin,
    },
    saldoBancoMin,
    avisos,
    valorHora: vh,
    tarifa,
  };
}

/** Ganho bruto de um dia ("Ganho hoje"). */
export function ganhoDoDia(e: Omit<EntradaPeriodo, "periodo" | "modo"> & { data: string }): ResultadoPeriodo {
  return calcularPeriodo({ ...e, periodo: { inicio: e.data, fim: e.data }, modo: "dia" });
}

export interface LinhaExtrato {
  texto: string;
  valor?: number;
  tipo: "titulo" | "ganho" | "extra" | "desconto" | "total" | "info";
}

/** Passo a passo do "Por que deu isso?" para um período. */
export function extratoDoPeriodo(r: ResultadoPeriodo): LinhaExtrato[] {
  const linhas: LinhaExtrato[] = [{ texto: `Período ${rotuloPeriodo(r.periodo)}`, tipo: "titulo" }];
  if (r.tarifa) linhas.push({ texto: `Valor da sua hora: ${formatarReais(r.valorHora)}`, tipo: "info" });
  for (const l of r.ganhos) {
    linhas.push({ texto: l.conta, valor: l.valor, tipo: l.tipo === "extra" ? "extra" : "ganho" });
  }
  linhas.push({ texto: `Total ganho = ${formatarReais(r.bruto)}`, valor: r.bruto, tipo: "total" });
  for (const l of r.descontos) linhas.push({ texto: l.conta, valor: -l.valor, tipo: "desconto" });
  if (r.descontos.length) {
    linhas.push({ texto: `Você deve receber = ${formatarReais(r.liquido)}`, valor: r.liquido, tipo: "total" });
  }
  if (r.saldoBancoMin !== 0) {
    linhas.push({
      texto: `Saldo de horas no período: ${formatarDuracao(r.saldoBancoMin, { sinal: true })} (não entra no dinheiro)`,
      tipo: "info",
    });
  }
  return linhas;
}
