import { arredondar } from "../dinheiro";
import type { FuncaoEquipe } from "../schema/producao";

/**
 * Equipe de obra mais comum e os pesos que reproduzem a divisão usual: com 2 ajudantes, 1 meio oficial e
 * 1 profissional, cada ajudante fica com 20%, o meio oficial com 26% e o profissional com 34%.
 */
export const EQUIPE_PADRAO: FuncaoEquipe[] = [
  { funcao: "Profissional", quantidade: 1, peso: 1.7 },
  { funcao: "Meio oficial", quantidade: 1, peso: 1.3 },
  { funcao: "Ajudante", quantidade: 2, peso: 1 },
];

export interface LinhaDivisao extends FuncaoEquipe {
  /** Quanto cada pessoa dessa função recebe (centavos). */
  cada: number;
  /** Parte de cada pessoa dessa função, de 0 a 1. */
  parte: number;
}

export interface ResultadoDivisao {
  linhas: LinhaDivisao[];
  /** Parte de quem está lançando, de 0 a 1 (0 se a função não estiver na equipe). */
  parte: number;
  minhaParte: number;
  /** Centavos que sobram ou faltam pelo arredondamento (fica com quem divide). */
  sobra: number;
  pessoas: number;
}

/** Soma dos pesos de todas as pessoas da equipe. */
function pesoTotal(equipe: FuncaoEquipe[]): number {
  return equipe.reduce((t, f) => t + f.quantidade * f.peso, 0);
}

/** Divide um valor entre a equipe pelo peso de cada função. Com `igual`, todo mundo recebe o mesmo. */
export function dividirEquipe(total: number, equipe: FuncaoEquipe[], minhaFuncao: string, igual = false): ResultadoDivisao {
  const pesos = equipe.filter((f) => f.quantidade > 0).map((f) => ({ ...f, peso: igual ? 1 : f.peso }));
  const soma = pesoTotal(pesos);
  const linhas: LinhaDivisao[] = pesos.map((f) => {
    const parte = soma > 0 ? f.peso / soma : 0;
    return { ...f, parte, cada: arredondar(total * parte) };
  });
  const minha = linhas.find((l) => l.funcao === minhaFuncao);
  const distribuido = linhas.reduce((t, l) => t + l.cada * l.quantidade, 0);
  return {
    linhas,
    parte: minha?.parte ?? 0,
    minhaParte: minha?.cada ?? 0,
    sobra: total - distribuido,
    pessoas: linhas.reduce((t, l) => t + l.quantidade, 0),
  };
}

/** "2 ajudantes, 1 meio oficial e 1 profissional" */
export function resumoEquipe(equipe: FuncaoEquipe[]): string {
  const partes = equipe
    .filter((f) => f.quantidade > 0)
    .map((f) => {
      const nome = f.funcao.toLowerCase();
      if (f.quantidade === 1) return `1 ${nome}`;
      // "profissional" → "profissionais", "meio oficial" → "meio oficiais", "ajudante" → "ajudantes"
      const plural = nome.endsWith("l") ? `${nome.slice(0, -1)}is` : `${nome}s`;
      return `${f.quantidade} ${plural}`;
    });
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}` : (partes[0] ?? "");
}
