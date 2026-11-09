import { formatarQuantidade, formatarReais, valorProducao } from "../dinheiro";
import type { ItemProducao } from "../schema/producao";

const ROTULOS: Record<string, string> = {
  m2: "m²",
  m3: "m³",
  m: "m",
  kg: "kg",
  pt: "pt",
  un: "un",
  h: "h",
  dia: "dia",
  saco: "saco",
  peca: "peça",
  verba: "verba",
};

/** "m2" -> "m²". Unidade digitada pela pessoa volta como está. */
export function rotuloUnidade(u: string): string {
  return ROTULOS[u] ?? u;
}

/** Chips de unidade na criação de serviço. */
export const UNIDADES_CHIPS = ["m2", "m", "m3", "un", "pt", "dia", "saco"] as const;

/** Minúsculas, sem acento e sem espaço repetido: "Assentar Meio-Fio" -> "assentar meio-fio". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface ResultadoBusca {
  itens: ItemProducao[];
  /** Texto para "+ Criar 'texto'" quando nenhum item tem exatamente esse nome. */
  criar: string | null;
}

/**
 * Busca no catálogo sem ligar para acentos. Todas as palavras precisam aparecer
 * (no nome ou na área). Quem começa com o texto vem primeiro.
 */
export function buscarItens(itens: ItemProducao[], texto: string, limite = 20): ResultadoBusca {
  const q = normalizar(texto);
  if (!q) return { itens: itens.slice(0, limite), criar: null };
  const palavras = q.split(" ");
  const pontuados: { item: ItemProducao; nota: number }[] = [];
  for (const item of itens) {
    const nome = normalizar(item.nome);
    const alvo = `${nome} ${normalizar(item.area)}`;
    if (!palavras.every((p) => alvo.includes(p))) continue;
    const nota = nome === q ? 0 : nome.startsWith(q) ? 1 : nome.includes(q) ? 2 : 3;
    pontuados.push({ item, nota });
  }
  pontuados.sort((a, b) => a.nota - b.nota || a.item.nome.localeCompare(b.item.nome, "pt-BR"));
  const exato = pontuados.some((p) => p.nota === 0);
  return { itens: pontuados.slice(0, limite).map((p) => p.item), criar: exato ? null : texto.trim() };
}

/** Prévia "50 m × R$ 12,00 = R$ 600,00". */
export function previaProducao(quantidade: number, unidade: string, preco: number): { texto: string; valor: number } {
  const valor = valorProducao(quantidade, preco);
  return {
    texto: `${formatarQuantidade(quantidade)} ${rotuloUnidade(unidade)} × ${formatarReais(preco)} = ${formatarReais(valor)}`,
    valor,
  };
}

export interface TotalArea {
  area: string;
  valor: number;
  lancamentos: number;
}

/** Totais por área de serviço, maior primeiro. */
export function totaisPorArea(
  itens: ItemProducao[],
  lancamentos: { itemId: string; quantidade: number; precoUnitario: number }[],
): TotalArea[] {
  const porId = new Map(itens.map((i) => [i.id, i]));
  const mapa = new Map<string, TotalArea>();
  for (const l of lancamentos) {
    const area = porId.get(l.itemId)?.area ?? "Outros";
    const t = mapa.get(area) ?? { area, valor: 0, lancamentos: 0 };
    t.valor += valorProducao(l.quantidade, l.precoUnitario);
    t.lancamentos += 1;
    mapa.set(area, t);
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}
