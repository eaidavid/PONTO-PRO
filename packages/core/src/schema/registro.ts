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
  observacao: z.string().max(200).optional(),
});
export type DiaRegistro = z.infer<typeof DiaRegistro>;
export type DiaRegistroEntrada = z.input<typeof DiaRegistro>;

export const Feriado = z.object({
  data: DataISO,
  nome: z.string().min(1).max(60),
  tipo: z.enum(["nacional", "local"]),
});
export type Feriado = z.infer<typeof Feriado>;
