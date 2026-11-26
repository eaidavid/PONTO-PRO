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
  /** Marcado com estrela: aparece primeiro. */
  favorito: z.boolean().optional(),
});
export type ItemProducao = z.infer<typeof ItemProducao>;

/** Uma função da equipe numa empreitada dividida: quantas pessoas e o peso de cada uma na divisão. */
export const FuncaoEquipe = z.object({
  funcao: z.string().trim().min(1).max(30),
  quantidade: z.number().int().min(0).max(50),
  /** Peso na divisão (ajudante 1, meio oficial 1,3, profissional 1,7...). */
  peso: z.number().positive().max(10),
});
export type FuncaoEquipe = z.infer<typeof FuncaoEquipe>;

/**
 * Serviço feito em equipe: o valor cheio fica no lançamento (quantidade × preço) e a pessoa recebe só a `parte`.
 * Ex.: laje de R$ 2.500 dividida entre 2 ajudantes, 1 meio oficial e 1 profissional.
 */
export const DivisaoEquipe = z.object({
  /** Fração da pessoa no valor cheio (0 a 1). */
  parte: z.number().gt(0).max(1),
  minhaFuncao: z.string().trim().min(1).max(30),
  equipe: z.array(FuncaoEquipe).min(1).max(8),
  /** Nome da empreitada que junta os serviços ("Laje do 2º andar"). */
  grupo: z.string().trim().max(60).optional(),
});
export type DivisaoEquipe = z.infer<typeof DivisaoEquipe>;

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
  obraId: z.string().optional(),
  /** Serviço da equipe: só a parte da pessoa entra no dinheiro dela. */
  divisao: DivisaoEquipe.optional(),
});
export type LancamentoProducao = z.infer<typeof LancamentoProducao>;
