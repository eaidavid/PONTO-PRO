/**
 * Dinheiro sempre em centavos inteiros. Arredondamento "meio para cima"
 * (para valores negativos, simétrico), aplicado em cada linha do extrato.
 */

export function arredondar(v: number): number {
  return v < 0 ? -Math.round(-v) : Math.round(v);
}

/** 123456 -> "R$ 1.234,56" (sem espaço especial, igual em todo lugar). */
export function formatarReais(centavos: number, opcoes: { sinal?: boolean } = {}): string {
  const neg = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const txt = `R$ ${reais},${String(abs % 100).padStart(2, "0")}`;
  if (neg) return `−${txt}`;
  return opcoes.sinal && abs > 0 ? `+${txt}` : txt;
}

/** Para frases: sem centavos quando redondo. 42000 -> "R$ 420". */
export function formatarReaisCurto(centavos: number): string {
  const txt = formatarReais(centavos);
  return Math.round(centavos) % 100 === 0 ? txt.slice(0, -3) : txt;
}

/** "1.234,56" / "1234,5" / "1234.56" -> centavos. Retorna null se inválido. */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(limpo)) return null;
  let normal = limpo;
  if (limpo.includes(",")) normal = limpo.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) normal = limpo.replace(/\./g, "");
  return Math.round(Number(normal) * 100);
}

/** Percentual para texto: 50 -> "50%", 12.5 -> "12,5%". */
export function formatarPercentual(p: number): string {
  return `${String(Math.round(p * 100) / 100).replace(".", ",")}%`;
}

/** Quantidade com até 3 casas: 12.5 -> "12,5". */
export function formatarQuantidade(q: number): string {
  const r = Math.round(q * 1000) / 1000;
  const [i, d] = r.toString().split(".");
  const inteiro = (i ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d ? `${inteiro},${d}` : inteiro;
}

/**
 * Valor do trabalho: tarifa como fração (centavos por minuto = num / den),
 * mais um adicional percentual. Uma única divisão, um único arredondamento.
 */
export interface Tarifa {
  num: number;
  den: number;
}

export function valorMinutos(min: number, tarifa: Tarifa, adicionalPct = 0): number {
  const fator = 10_000 + Math.round(adicionalPct * 100);
  return arredondar((min * tarifa.num * fator) / (tarifa.den * 10_000));
}

/** Apenas o adicional (ex.: adicional noturno de 20% sobre a hora). */
export function valorAdicional(min: number, tarifa: Tarifa, pct: number): number {
  return arredondar((min * tarifa.num * Math.round(pct * 100)) / (tarifa.den * 10_000));
}

/** Valor de uma hora pela tarifa (para mostrar no extrato). */
export function valorHoraDaTarifa(t: Tarifa): number {
  return arredondar((60 * t.num) / t.den);
}

export function aplicarPercentual(base: number, pct: number): number {
  return arredondar((base * Math.round(pct * 100)) / 10_000);
}

/** quantidade × preço, com quantidade de até 3 casas. */
export function valorProducao(quantidade: number, precoUnitario: number): number {
  return arredondar((Math.round(quantidade * 1000) * precoUnitario) / 1000);
}
