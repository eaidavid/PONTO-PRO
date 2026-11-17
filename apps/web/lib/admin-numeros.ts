import { type CicloCobranca, valorDoCiclo } from "@ponto-pro/core";

/** Receita do mês: mensalidades + anuidades ÷ 12, sem cortesia. */
export function receitaMensal(linhas: { plano: string; ciclo: string | null; trabalhadores: number | null; provedor: string; status: string; pago_ate: string }[], hoje: string): number {
  return linhas
    .filter((s) => s.provedor !== "cortesia" && s.status !== "cancelada" && s.pago_ate >= hoje && (s.plano === "individual" || s.plano === "equipe"))
    .reduce((t, s) => {
      const ciclo = (s.ciclo === "anual" ? "anual" : "mensal") as CicloCobranca;
      const v = valorDoCiclo(s.plano as "individual" | "equipe", ciclo, s.trabalhadores ?? 1);
      return t + (ciclo === "anual" ? Math.round(v / 12) : v);
    }, 0);
}
