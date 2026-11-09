import type { Linha, ResultadoPeriodo } from "../calculo/periodo";
import { rotuloPeriodo } from "../ciclo";

export interface DadosContracheque {
  nome?: string;
  cargo?: string;
  empresa?: string;
  documento?: string;
  logoUrl?: string;
}

export interface ItemContracheque {
  codigo: string;
  descricao: string;
  referencia: string;
  provento: number | null;
  desconto: number | null;
  explicacao: string;
}

export interface Contracheque {
  empresa: string;
  funcionario: string;
  cargo: string;
  documento?: string;
  logoUrl?: string;
  referencia: string;
  itens: ItemContracheque[];
  totalProventos: number;
  totalDescontos: number;
  liquido: number;
  avisos: string[];
  rodape: string;
}

export const RODAPE_CONTRACHEQUE = "Estimativa, sem validade legal";

/** Termos técnicos do contracheque e a explicação curta mostrada ao tocar. */
export const GLOSSARIO: Record<string, string> = {
  Proventos: "Ganhos: tudo o que entra no seu pagamento.",
  Descontos: "O que sai do seu pagamento.",
  Referência: "A base da conta: horas, dias, quantidade ou percentual.",
  Líquido: "O que sobra para você depois dos descontos.",
  Código: "Número da linha, para conferir com quem paga.",
  "Folga remunerada": "Dia de descanso que também é pago (DSR).",
  "Saldo de horas": "Horas a mais ou a menos guardadas para compensar depois (banco de horas).",
};

function item(l: Linha, desconto: boolean): ItemContracheque {
  return {
    codigo: l.codigo,
    descricao: l.descricao,
    referencia: l.referencia,
    provento: desconto ? null : l.valor,
    desconto: desconto ? l.valor : null,
    explicacao: l.explicacao,
  };
}

/** Contracheque estimado a partir do resultado do período. */
export function gerarContracheque(r: ResultadoPeriodo, dados: DadosContracheque = {}): Contracheque {
  const c: Contracheque = {
    empresa: dados.empresa?.trim() || "Controle pessoal",
    funcionario: dados.nome?.trim() || "Trabalhador",
    cargo: dados.cargo?.trim() || "",
    referencia: rotuloPeriodo(r.periodo),
    itens: [...r.ganhos.map((l) => item(l, false)), ...r.descontos.map((l) => item(l, true))],
    totalProventos: r.bruto,
    totalDescontos: r.totalDescontos,
    liquido: r.liquido,
    avisos: r.avisos.map((a) => a.texto),
    rodape: RODAPE_CONTRACHEQUE,
  };
  if (dados.documento) c.documento = dados.documento;
  if (dados.logoUrl) c.logoUrl = dados.logoUrl;
  return c;
}
