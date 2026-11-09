import { z } from "zod";
import { DataISO, Hora } from "./perfil";

export const TipoDia = z.enum(["normal", "falta", "atestado", "feriado", "folga", "compensado"]);
export type TipoDia = z.infer<typeof TipoDia>;

/** Marcações do dia. Horário menor que o anterior = passou da meia-noite. */
export const Marcacoes = z.object({
  entrada: Hora.optional(),
  almoco: Hora.optional(),
  volta: Hora.optional(),
  saida: Hora.optional(),
});
export type Marcacoes = z.infer<typeof Marcacoes>;

export const DiaRegistro = z.object({
  data: DataISO,
  tipo: TipoDia.default("normal"),
  marcacoes: Marcacoes.default({}),
  /** Anotação do dia ("choveu, obra parada"). Entra na busca do histórico. */
  observacao: z.string().max(200).optional(),
  /** Obra ou cliente do dia (quando a pessoa trabalha em mais de um lugar). */
  obraId: z.string().optional(),
});
export type DiaRegistro = z.infer<typeof DiaRegistro>;
export type DiaRegistroEntrada = z.input<typeof DiaRegistro>;

export const Feriado = z.object({
  data: DataISO,
  nome: z.string().min(1).max(60),
  tipo: z.enum(["nacional", "local"]),
});
export type Feriado = z.infer<typeof Feriado>;

export const Obra = z.object({
  id: z.string(),
  nome: z.string().trim().min(1, "Dê um nome à obra").max(40),
  arquivada: z.boolean().default(false),
});
export type Obra = z.infer<typeof Obra>;
