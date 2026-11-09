import { z } from "zod";
import { Centavos, DataISO } from "./perfil";

export const UNIDADES_PADRAO = [
  "m2", "m3", "m", "kg", "pt", "un", "h", "dia", "saco", "peca", "verba",
] as const;
export const UnidadePadrao = z.enum(UNIDADES_PADRAO);
/** Unidade padrão ou outra digitada pela pessoa. */
export const Unidade = z.string().trim().min(1, "Escolha a unidade").max(12, "Unidade curta, até 12 letras");
export type Unidade = z.infer<typeof Unidade>;

export const ItemProducao = z.object({
  id: z.string(),
  nome: z.string().trim().min(2, "Nome curto demais").max(80),
  area: z.string().trim().min(1).max(40),
  unidade: Unidade,
  preco: Centavos,
  /** true = preço de exemplo do catálogo, ainda não conferido pela pessoa. */
  exemplo: z.boolean().default(false),
});
export type ItemProducao = z.infer<typeof ItemProducao>;

export const LancamentoProducao = z.object({
  id: z.string(),
  data: DataISO,
  itemId: z.string(),
  /** Até 3 casas decimais (ex.: 12,5 m²). */
  quantidade: z
    .number({ error: "Informe a quantidade" })
    .positive("A quantidade precisa ser maior que zero")
    .max(1_000_000, "Quantidade alta demais"),
  /** Preço no momento do lançamento (mudar o catálogo não altera o passado). */
  precoUnitario: Centavos,
  descricao: z.string().max(200).optional(),
});
export type LancamentoProducao = z.infer<typeof LancamentoProducao>;
