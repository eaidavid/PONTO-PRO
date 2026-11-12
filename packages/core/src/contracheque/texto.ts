import { formatarReais } from "../dinheiro";
import type { Contracheque } from "./index";

/**
 * Textos prontos para colar no WhatsApp (negrito com *, itálico com _).
 * Um texto só para "Copiar" e "Enviar no WhatsApp": o que a pessoa cola é o mesmo que ela vê.
 */

/** Contracheque estimado em texto, linha por linha. */
export function textoContracheque(cc: Contracheque, marca: string): string {
  const valor = (i: Contracheque["itens"][number]) =>
    i.desconto ? `−${formatarReais(i.desconto)}` : formatarReais(i.provento ?? 0);
  return [
    `*Contracheque estimado — ${cc.referencia}*`,
    `${cc.funcionario}${cc.cargo ? ` · ${cc.cargo}` : ""}`,
    "",
    ...cc.itens.map((i) => `${i.descricao} (${i.referencia}): ${valor(i)}`),
    "",
    `Ganhos: ${formatarReais(cc.totalProventos)}`,
    `Descontos: −${formatarReais(cc.totalDescontos)}`,
    `*Líquido: ${formatarReais(cc.liquido)}*`,
    "",
    `_${cc.rodape} · ${marca}_`,
  ].join("\n");
}

export interface DadosResumo {
  /** "21/10 a 20/11" */
  referencia: string;
  /** Líquido previsto até o fechamento (centavos). */
  previsto: number;
  /** Líquido já ganho até hoje (centavos). */
  jaGanhou: number;
  /** "Cai em 05/12 · em 26 dias" */
  quando?: string;
  /** Grupos de "De onde vem", na ordem da tela. Descontos com `desconto: true`. */
  grupos: { rotulo: string; valor: number; desconto?: boolean }[];
  marca: string;
}

/** Resumo do período em texto: quanto vai pingar, quando e de onde vem. */
export function textoResumo(d: DadosResumo): string {
  return [
    `*Meus ganhos — período ${d.referencia}*`,
    `Vai pingar: *${formatarReais(d.previsto)}*`,
    ...(d.quando ? [d.quando] : []),
    `Já ganhei: ${formatarReais(d.jaGanhou)}`,
    "",
    ...d.grupos.map((g) => `${g.rotulo}: ${g.desconto ? "−" : ""}${formatarReais(g.valor)}`),
    "",
    `_Estimativa, sem validade legal · ${d.marca}_`,
  ].join("\n");
}
