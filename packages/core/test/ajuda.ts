import { escalaPreset } from "../src/escala";
import type { PerfilTrabalho } from "../src/schema/perfil";
import type { DiaRegistro, TipoDia } from "../src/schema/registro";

/** José, pedreiro: R$ 25,00/h, seg–qui 7h–17h, sex 7h–16h, 1h de almoço (44h). */
export function perfilJose(ajustes: Partial<PerfilTrabalho> = {}): PerfilTrabalho {
  return {
    versao: 1,
    id: "p1",
    nome: "Obra",
    area: "construcao",
    fuso: "America/Sao_Paulo",
    pagamento: { forma: "hora", valorHora: 2500 },
    escala: escalaPreset("seg-sex-44"),
    jornada: { limiteDiarioMin: 600, limiteSemanalMin: 2640, compensacaoSemanal: true },
    adicionais: {
      extraDiaUtil: 50,
      extraSabado: 50,
      extraDomingo: 100,
      extraFeriado: 100,
      feriadoTrabalhado: { abonaDia: true },
      noturno: { ativo: false, percentual: 20, inicio: "22:00", fim: "05:00", horaReduzida: false },
    },
    bancoHoras: { ativo: false, pagaDomingoFeriado: true },
    ciclo: { diaFechamento: 20 },
    descontos: [],
    producao: { ativo: true, pacotes: [] },
    sugestoes: [],
    atualizadoEm: "2026-11-09T10:00:00-03:00",
    ...ajustes,
  };
}

/** Registro de um dia: dia("2026-10-26", "07:00", "12:00", "13:00", "17:00"). */
export function dia(data: string, entrada?: string, almoco?: string, volta?: string, saida?: string, tipo: TipoDia = "normal"): DiaRegistro {
  const marcacoes: DiaRegistro["marcacoes"] = {};
  if (entrada) marcacoes.entrada = entrada;
  if (almoco) marcacoes.almoco = almoco;
  if (volta) marcacoes.volta = volta;
  if (saida) marcacoes.saida = saida;
  return { data, tipo, marcacoes };
}

/** Semana completa do José (26/10 a 30/10/2026), exatamente como a escala. */
export function semanaJose(): DiaRegistro[] {
  return [
    dia("2026-10-26", "07:00", "12:00", "13:00", "17:00"),
    dia("2026-10-27", "07:00", "12:00", "13:00", "17:00"),
    dia("2026-10-28", "07:00", "12:00", "13:00", "17:00"),
    dia("2026-10-29", "07:00", "12:00", "13:00", "17:00"),
    dia("2026-10-30", "07:00", "12:00", "13:00", "16:00"),
  ];
}

export const SEMANA = { inicio: "2026-10-25", fim: "2026-10-31" };
