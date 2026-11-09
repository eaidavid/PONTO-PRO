import type { DiaEscala, Escala } from "../schema/perfil";
import { diaDaSemana, diasEntre, horaParaMin, minParaHora } from "../tempo";

/** Escala prevista para a data (semanal pelo dia da semana; cíclica pela data de início). */
export function escalaDoDia(escala: Escala, data: string): DiaEscala {
  if (escala.tipo === "semanal") return escala.dias[diaDaSemana(data)]!;
  const n = escala.padrao.length;
  const i = ((diasEntre(escala.inicioEm, data) % n) + n) % n;
  return escala.padrao[i]!;
}

/** Monta um dia de escala a partir dos horários. Calcula as horas líquidas. */
export function diaDeTrabalho(inicio: string, fim: string, almocoMin: number): DiaEscala {
  let total = horaParaMin(fim) - horaParaMin(inicio);
  if (total <= 0) total += 1440;
  return { trabalha: true, inicio, fim, almocoMin, horasLiquidasMin: Math.max(0, total - almocoMin) };
}

export const FOLGA: DiaEscala = { trabalha: false, almocoMin: 0, horasLiquidasMin: 0 };

/** Total de horas previstas numa semana (para cíclica: média de 7 dias). */
export function horasSemanais(escala: Escala): number {
  if (escala.tipo === "semanal") return escala.dias.reduce((t, d) => t + d.horasLiquidasMin, 0);
  const total = escala.padrao.reduce((t, d) => t + d.horasLiquidasMin, 0);
  return Math.round((total * 7) / escala.padrao.length);
}

/** Horários sugeridos para os chips do seletor de hora, a partir da escala. */
export function horariosComuns(escala: Escala): string[] {
  const dias = escala.tipo === "semanal" ? escala.dias : escala.padrao;
  const set = new Set<string>();
  for (const d of dias) {
    for (const h of Object.values(marcacoesPrevistas(d))) if (h) set.add(h);
  }
  return [...set].sort();
}

/** Marcações "como previsto" para um dia de escala (usado na previsão). */
export function marcacoesPrevistas(d: DiaEscala): { entrada?: string; almoco?: string; volta?: string; saida?: string } {
  if (!d.trabalha) return {};
  const inicio = d.inicio ?? "08:00";
  const ini = horaParaMin(inicio);
  if (d.almocoMin <= 0) return { entrada: inicio, saida: minParaHora(ini + d.horasLiquidasMin) };
  // almoço depois de 5h de trabalho (ou no fim, se o turno for menor)
  const almoco = ini + Math.min(300, d.horasLiquidasMin);
  const volta = almoco + d.almocoMin;
  const saida = volta + (d.horasLiquidasMin - (almoco - ini));
  return { entrada: inicio, almoco: minParaHora(almoco), volta: minParaHora(volta), saida: minParaHora(saida) };
}

// ---------- presets ----------

export type PresetId = "seg-sex-44" | "seg-sab-44" | "6x1" | "12x36" | "seg-sex-40";

/** Escalas prontas. Todas editáveis depois. */
export function escalaPreset(id: PresetId, inicioCiclo = "2026-01-01"): Escala {
  switch (id) {
    case "seg-sex-44": {
      const sq = diaDeTrabalho("07:00", "17:00", 60);
      return { tipo: "semanal", preset: "seg-sex-44", dias: [FOLGA, sq, sq, sq, sq, diaDeTrabalho("07:00", "16:00", 60), FOLGA] };
    }
    case "seg-sex-40": {
      const d = diaDeTrabalho("08:00", "17:00", 60);
      return { tipo: "semanal", preset: "personalizada", dias: [FOLGA, d, d, d, d, d, FOLGA] };
    }
    case "seg-sab-44": {
      const d = diaDeTrabalho("07:00", "16:00", 60);
      return { tipo: "semanal", preset: "seg-sab-44", dias: [FOLGA, d, d, d, d, d, diaDeTrabalho("07:00", "11:00", 0)] };
    }
    case "6x1": {
      const d = diaDeTrabalho("08:00", "16:20", 60);
      return { tipo: "semanal", preset: "6x1", dias: [FOLGA, d, d, d, d, d, d] };
    }
    case "12x36":
      return { tipo: "ciclica", preset: "12x36", padrao: [diaDeTrabalho("19:00", "07:00", 60), FOLGA], inicioEm: inicioCiclo };
  }
}
