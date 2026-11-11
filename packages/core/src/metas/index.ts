import { tarifaDoPerfil } from "../calculo/periodo";
import { tabelaDoAno } from "../clt";
import { formatarQuantidade, formatarReaisCurto, valorMinutos } from "../dinheiro";
import { rotuloUnidade } from "../producao";
import type { PerfilTrabalho } from "../schema/perfil";
import type { ItemProducao } from "../schema/producao";
import { formatarHorasCurto } from "../tempo";

export type TipoOpcaoMeta = "horas-extras" | "sabados" | "folgas" | "producao";

export interface OpcaoMeta {
  tipo: TipoOpcaoMeta;
  /** Quantas vezes (horas, sábados, folgas ou unidades). */
  quantidade: number;
  /** Quanto rende cada uma, em centavos (bruto). */
  valorCada: number;
  /** "3 sábados de 5h", "39 m de Assentar meio-fio" */
  texto: string;
}

export interface EntradaMeta {
  perfil: PerfilTrabalho;
  /** Quanto a pessoa quer receber no período (líquido, centavos). */
  alvo: number;
  /** Líquido previsto pela escala (da previsão). */
  previsto: number;
  /** Serviço para a opção de produção. */
  item?: ItemProducao;
  /** Horas de um sábado extra (padrão 5h). */
  horasSabadoMin?: number;
}

export interface ResultadoMeta {
  faltaLiquido: number;
  faltaBruto: number;
  opcoes: OpcaoMeta[];
  frase: string;
  /** Observação quando alguma opção não vale (ex.: saldo de horas ligado). */
  observacao?: string;
}

/** Passo dos botões + e − da meta (R$ 50). */
export const PASSO_META = 5000;

function horasTipicas(perfil: PerfilTrabalho): number {
  const dias = perfil.escala.tipo === "semanal" ? perfil.escala.dias : perfil.escala.padrao;
  return Math.max(0, ...dias.map((d) => d.horasLiquidasMin)) || 480;
}

/** "Quero receber R$ X": o que precisa fazer a mais. */
export function simularMeta(e: EntradaMeta): ResultadoMeta {
  const { perfil } = e;
  const faltaLiquido = Math.max(0, e.alvo - e.previsto);
  // percentuais fixos + a alíquota da faixa de INSS e IR em que o dinheiro extra cai
  const ano = Number(new Date().getFullYear());
  const t = tabelaDoAno(ano);
  const ref = e.previsto;
  const marginalInss = perfil.descontos.some((d) => d.tipo === "inss")
    ? (t.inss.faixas.find((f) => ref <= f.ate)?.aliquota ?? 0) / 100
    : 0;
  const marginalIr =
    perfil.descontos.some((d) => d.tipo === "irrf") && ref > (t.irrf.reducao?.limiteIsencao ?? 0)
      ? (t.irrf.faixas.find((f) => ref <= f.ate)?.aliquota ?? 0) / 100
      : 0;
  const pct = perfil.descontos.reduce((tt, d) => tt + (d.tipo === "percentual" ? d.valor : 0), 0) + marginalInss + marginalIr;
  if (faltaLiquido === 0) {
    return {
      faltaLiquido: 0,
      faltaBruto: 0,
      opcoes: [],
      frase: `Pela previsão, você já chega lá: ${formatarReaisCurto(e.previsto)}.`,
    };
  }
  if (pct >= 100) {
    return {
      faltaLiquido,
      faltaBruto: 0,
      opcoes: [],
      frase: "Os descontos levam tudo o que você ganha a mais. Confira em Ajustes.",
    };
  }
  const faltaBruto = Math.ceil((faltaLiquido * 10_000) / (10_000 - Math.round(pct * 100)));
  const tarifa = tarifaDoPerfil(perfil);
  const opcoes: OpcaoMeta[] = [];
  let observacao: string | undefined;
  const banco = perfil.bancoHoras;
  const pagaUtilSabado = !banco.ativo;
  const pagaDomingo = !banco.ativo || banco.pagaDomingoFeriado;
  if (banco.ativo) observacao = "Com o saldo de horas ligado, hora extra em dia útil e sábado vai para o saldo, não para o dinheiro.";

  if (tarifa) {
    if (pagaUtilSabado) {
      const v = valorMinutos(60, tarifa, perfil.adicionais.extraDiaUtil);
      const q = Math.ceil(faltaBruto / v);
      opcoes.push({ tipo: "horas-extras", quantidade: q, valorCada: v, texto: `${q} ${q === 1 ? "hora extra" : "horas extras"}` });
      const sabLivre = perfil.escala.tipo === "semanal" && !perfil.escala.dias[6]!.trabalha;
      if (sabLivre) {
        const h = e.horasSabadoMin ?? 300;
        const vs = valorMinutos(h, tarifa, perfil.adicionais.extraSabado);
        const qs = Math.ceil(faltaBruto / vs);
        opcoes.push({ tipo: "sabados", quantidade: qs, valorCada: vs, texto: `${qs} ${qs === 1 ? "sábado" : "sábados"} de ${formatarHorasCurto(h)}` });
      }
    }
    if (pagaDomingo) {
      const h = horasTipicas(perfil);
      const vf = valorMinutos(h, tarifa, perfil.adicionais.extraDomingo);
      const qf = Math.ceil(faltaBruto / vf);
      opcoes.push({ tipo: "folgas", quantidade: qf, valorCada: vf, texto: `${qf} ${qf === 1 ? "folga trabalhada" : "folgas trabalhadas"} de ${formatarHorasCurto(h)}` });
    }
  }
  if (e.item && e.item.preco > 0) {
    const q = Math.ceil(faltaBruto / e.item.preco);
    opcoes.push({
      tipo: "producao",
      quantidade: q,
      valorCada: e.item.preco,
      texto: `${formatarQuantidade(q)} ${rotuloUnidade(e.item.unidade)} de ${e.item.nome.toLowerCase()}`,
    });
  }
  const preferidas = [
    ...opcoes.filter((o) => o.tipo === "sabados" || o.tipo === "producao"),
    ...opcoes.filter((o) => o.tipo !== "sabados" && o.tipo !== "producao"),
  ].slice(0, 2);
  const frase = preferidas.length
    ? `Faltam ${formatarReaisCurto(faltaLiquido)}. Dá com ${preferidas.map((o) => o.texto).join(" ou ")}.`
    : `Faltam ${formatarReaisCurto(faltaLiquido)}.`;
  return { faltaLiquido, faltaBruto, opcoes, frase, ...(observacao ? { observacao } : {}) };
}
