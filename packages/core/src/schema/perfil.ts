import { z } from "zod";

/**
 * Perfil de Trabalho: todas as regras que o motor usa.
 * Convenções: dinheiro em centavos inteiros, tempo em minutos inteiros,
 * percentual de 0 a 100 com até 2 casas. Nenhuma regra é fixa no código.
 */

// ---------- básicos ----------
export const Centavos = z
  .number({ error: "Informe um valor" })
  .int("Use centavos inteiros")
  .min(0, "O valor não pode ser negativo")
  .max(100_000_000, "Valor alto demais");
export const Minutos = z
  .number()
  .int()
  .min(0, "Não pode ser negativo")
  .max(24 * 60, "Não pode passar de 24h");
const casas2 = (v: number) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6;
export const Percentual = z
  .number({ error: "Informe um percentual" })
  .min(0, "O desconto deve ficar entre 0% e 100%")
  .max(100, "O desconto deve ficar entre 0% e 100%")
  .refine(casas2, "Use no máximo 2 casas decimais");
export const PercentualAdicional = z
  .number({ error: "Informe um percentual" })
  .min(0, "O adicional deve ficar entre 0% e 300%")
  .max(300, "O adicional deve ficar entre 0% e 300%")
  .refine(casas2, "Use no máximo 2 casas decimais");
export const Hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato 07:00");
export const DataISO = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Use o formato 2026-11-20");

export const Area = z.enum(["construcao", "comercio", "saude", "transporte", "servicos", "outro"]);
export type Area = z.infer<typeof Area>;

// ---------- forma de pagamento ----------
const Divisor = z.number().int().min(1, "Divisor inválido").max(400, "Divisor inválido");

export const Pagamento = z.discriminatedUnion("forma", [
  z.object({ forma: z.literal("hora"), valorHora: Centavos.min(1, "Informe o valor da hora") }),
  z.object({
    forma: z.literal("diaria"),
    valorDiaria: Centavos.min(1, "Informe o valor da diária"),
    /** Horas de uma diária. Usado para achar o valor da hora extra. */
    horasDiariaMin: Minutos.min(60, "Uma diária precisa de pelo menos 1h"),
  }),
  z.object({
    forma: z.literal("mensal"),
    salario: Centavos.min(1, "Informe o salário"),
    /** Divisor para achar o valor da hora (sugestão: 220 para 44h/semana). */
    divisorHoras: Divisor,
  }),
  z.object({ forma: z.literal("producao") }),
  z.object({
    forma: z.literal("misto"),
    base: z.enum(["hora", "diaria", "mensal"]),
    valorHora: Centavos.optional(),
    valorDiaria: Centavos.optional(),
    horasDiariaMin: Minutos.optional(),
    salario: Centavos.optional(),
    divisorHoras: Divisor.optional(),
  }),
]);
export type Pagamento = z.infer<typeof Pagamento>;

// ---------- escala ----------
export const DiaEscala = z.object({
  trabalha: z.boolean(),
  inicio: Hora.optional(),
  fim: Hora.optional(),
  almocoMin: Minutos.max(240, "Almoço de no máximo 4h"),
  /** Horas previstas já sem o almoço (9h = 540). */
  horasLiquidasMin: Minutos,
});
export type DiaEscala = z.infer<typeof DiaEscala>;

export const PresetSemanal = z.enum(["seg-sex-44", "seg-sab-44", "6x1", "personalizada"]);
export const PresetCiclico = z.enum(["12x36", "6x1-rotativa", "personalizada"]);

export const Escala = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("semanal"),
    preset: PresetSemanal,
    /** Domingo a sábado (índice 0 = domingo). */
    dias: z.array(DiaEscala).length(7),
  }),
  z.object({
    tipo: z.literal("ciclica"),
    preset: PresetCiclico,
    padrao: z.array(DiaEscala).min(2).max(14),
    /** Dia que corresponde a padrao[0]. */
    inicioEm: DataISO,
  }),
]);
export type Escala = z.infer<typeof Escala>;

// ---------- jornada e compensação ----------
export const Jornada = z.object({
  limiteDiarioMin: Minutos,
  limiteSemanalMin: z.number().int().min(0).max(7 * 24 * 60),
  /** Horas a mais em um dia cobrem horas a menos em outro da mesma semana. */
  compensacaoSemanal: z.boolean(),
});
export type Jornada = z.infer<typeof Jornada>;

// ---------- adicionais por tipo de dia ----------
export const Adicionais = z.object({
  extraDiaUtil: PercentualAdicional,
  extraSabado: PercentualAdicional,
  extraDomingo: PercentualAdicional,
  extraFeriado: PercentualAdicional,
  feriadoTrabalhado: z.object({
    /** Recebe as horas previstas do dia mesmo sem trabalhar. */
    abonaDia: z.boolean(),
  }),
  noturno: z.object({
    ativo: z.boolean(),
    percentual: PercentualAdicional,
    inicio: Hora,
    fim: Hora,
    /** Hora noturna de 52min30s. */
    horaReduzida: z.boolean(),
  }),
});
export type Adicionais = z.infer<typeof Adicionais>;

// ---------- banco de horas (no app: "Saldo de horas") ----------
export const BancoHoras = z.object({
  ativo: z.boolean(),
  /** Quando ligado, hora extra de domingo e feriado continua sendo paga. */
  pagaDomingoFeriado: z.boolean().default(true),
  limiteMin: z.number().int().min(0).max(1000 * 60).optional(),
  validadeMeses: z.number().int().min(1).max(12).optional(),
});
export type BancoHoras = z.infer<typeof BancoHoras>;

// ---------- ciclo (no app: "Período") ----------
export const Ciclo = z.object({
  /** 20 => período de 21 a 20. 31 => fecha no último dia do mês. */
  diaFechamento: z
    .number()
    .int()
    .min(1, "Escolha um dia entre 1 e 31")
    .max(31, "Escolha um dia entre 1 e 31"),
});
export type Ciclo = z.infer<typeof Ciclo>;

// ---------- descontos ----------
const NomeDesconto = z.string().trim().min(1, "Dê um nome ao desconto").max(40);
export const Desconto = z.discriminatedUnion("tipo", [
  z.object({ id: z.string(), nome: NomeDesconto, tipo: z.literal("percentual"), valor: Percentual }),
  z.object({ id: z.string(), nome: NomeDesconto, tipo: z.literal("fixo"), valor: Centavos }),
]);
export type Desconto = z.infer<typeof Desconto>;

// ---------- produção ----------
export const ProducaoConfig = z.object({
  ativo: z.boolean(),
  /** Pacotes do catálogo escolhidos no onboarding. */
  pacotes: z.array(z.string()),
});

// ---------- perfil completo ----------
export const PerfilTrabalho = z
  .object({
    versao: z.literal(1),
    id: z.string(),
    nome: z.string().trim().min(1).max(60),
    area: Area,
    modelo: z.object({ id: z.string(), versao: z.number().int() }).optional(),
    fuso: z.literal("America/Sao_Paulo"),
    pagamento: Pagamento,
    escala: Escala,
    jornada: Jornada,
    adicionais: Adicionais,
    bancoHoras: BancoHoras,
    ciclo: Ciclo,
    descontos: z.array(Desconto).max(20),
    producao: ProducaoConfig,
    /** Caminhos que ainda estão no valor sugerido (mostram o selo "Sugestão"). */
    sugestoes: z.array(z.string()),
    atualizadoEm: z.string(),
  })
  .superRefine((p, ctx) => {
    const pg = p.pagamento;
    if (pg.forma === "misto") {
      const ok =
        (pg.base === "hora" && !!pg.valorHora) ||
        (pg.base === "diaria" && !!pg.valorDiaria && !!pg.horasDiariaMin) ||
        (pg.base === "mensal" && !!pg.salario && !!pg.divisorHoras);
      if (!ok) {
        ctx.addIssue({
          code: "custom",
          path: ["pagamento"],
          message: "Informe o valor da base escolhida",
        });
      }
    }
    const dias = p.escala.tipo === "semanal" ? p.escala.dias : p.escala.padrao;
    dias.forEach((d, i) => {
      if (!d.trabalha && d.horasLiquidasMin > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["escala", i, "horasLiquidasMin"],
          message: "Dia de folga não pode ter horas previstas",
        });
      }
    });
  });

export type PerfilTrabalho = z.infer<typeof PerfilTrabalho>;
export type PerfilTrabalhoEntrada = z.input<typeof PerfilTrabalho>;
