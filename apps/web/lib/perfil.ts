import {
  confirmarCampo,
  type DiaEscala,
  diaDeTrabalho,
  type Escala,
  escalaPreset,
  FOLGA,
  horaParaMin,
  horasSemanais,
  minParaHora,
  type Pagamento,
  type PerfilTrabalho,
  type PresetId,
} from "@ponto-pro/core";

/** Aplica uma mudança e tira o selo "Sugestão" dos campos tocados. */
export function editar(perfil: PerfilTrabalho, caminhos: string[], mudar: (p: PerfilTrabalho) => void): PerfilTrabalho {
  let p = structuredClone(perfil);
  mudar(p);
  for (const c of caminhos) p = confirmarCampo(p, c);
  return p;
}

/** Troca a escala e ajusta o limite semanal para o total da nova semana. */
export function comEscala(perfil: PerfilTrabalho, escala: Escala): PerfilTrabalho {
  return { ...perfil, escala, jornada: { ...perfil.jornada, limiteSemanalMin: horasSemanais(escala) } };
}

export function aplicarPreset(perfil: PerfilTrabalho, id: PresetId, hoje: string): PerfilTrabalho {
  return comEscala(perfil, escalaPreset(id, hoje));
}

export function minutosDaSemana(escala: Escala): number[] | null {
  return escala.tipo === "semanal" ? escala.dias.map((d) => (d.trabalha ? d.horasLiquidasMin : 0)) : null;
}

function almocoPadrao(escala: Escala): number {
  const dias = escala.tipo === "semanal" ? escala.dias : escala.padrao;
  return dias.find((d) => d.trabalha && d.horasLiquidasMin > 360)?.almocoMin ?? 60;
}

/** Muda as horas de um dia mantendo o horário de entrada; a saída é recalculada. */
export function definirDia(escala: Escala, dia: number, minutos: number): Escala {
  if (escala.tipo !== "semanal") return escala;
  const dias = [...escala.dias];
  const atual = dias[dia]!;
  if (minutos <= 0) dias[dia] = FOLGA;
  else {
    const inicio = atual.inicio ?? "07:00";
    const almoco = minutos > 360 ? (atual.trabalha && atual.almocoMin ? atual.almocoMin : almocoPadrao(escala)) : 0;
    dias[dia] = diaDeTrabalho(inicio, minParaHora(horaParaMin(inicio) + minutos + almoco), almoco);
  }
  return { ...escala, preset: "personalizada", dias };
}

/** Muda o almoço de todos os dias de trabalho (mantém as horas líquidas). */
export function definirAlmoco(escala: Escala, almocoMin: number): Escala {
  const ajustar = (d: DiaEscala): DiaEscala => {
    if (!d.trabalha || d.horasLiquidasMin <= 360) return d;
    const inicio = d.inicio ?? "07:00";
    return diaDeTrabalho(inicio, minParaHora(horaParaMin(inicio) + d.horasLiquidasMin + almocoMin), almocoMin);
  };
  return escala.tipo === "semanal" ? { ...escala, dias: escala.dias.map(ajustar) } : { ...escala, padrao: escala.padrao.map(ajustar) };
}

export function almocoAtual(escala: Escala): number {
  return almocoPadrao(escala);
}

/**
 * Formas que as telas oferecem. "misto-mensal" é o salário fixo somado à produção:
 * no perfil ele é gravado como { forma: "misto", base: "mensal" }, que o motor de cálculo já entende.
 */
export type Forma = Pagamento["forma"] | "misto-mensal";

/** A forma da tela que corresponde a um pagamento gravado. */
export function formaDe(p: Pagamento): Forma {
  return p.forma === "misto" && p.base === "mensal" ? "misto-mensal" : p.forma;
}

/** Recebe pelo que lança na Produção, sozinho ou somado a um valor fixo. */
export function somaProducao(f: Forma): boolean {
  return f === "producao" || f === "misto" || f === "misto-mensal";
}

/** Pagamento novo para a forma escolhida, levando o valor que já existir. */
export function pagamentoPara(forma: Forma, atual: Pagamento, horasDia = 480): Pagamento {
  const a = atual as Partial<{ valorHora: number; valorDiaria: number; salario: number; divisorHoras: number; horasDiariaMin: number }>;
  switch (forma) {
    case "hora":
      return { forma, valorHora: a.valorHora ?? 0 };
    case "diaria":
      return { forma, valorDiaria: a.valorDiaria ?? 0, horasDiariaMin: a.horasDiariaMin ?? horasDia };
    case "mensal":
      return { forma, salario: a.salario ?? 0, divisorHoras: a.divisorHoras ?? 220 };
    case "producao":
      return { forma };
    case "misto":
      return { forma, base: "hora", valorHora: a.valorHora ?? 0 };
    case "misto-mensal":
      return { forma: "misto", base: "mensal", salario: a.salario ?? 0, divisorHoras: a.divisorHoras ?? 220 };
  }
}

/** Salário e divisor de quem recebe por mês, com ou sem produção. Null nas outras formas. */
export function salarioMensal(p: Pagamento): { salario: number; divisorHoras: number } | null {
  if (p.forma === "mensal") return { salario: p.salario, divisorHoras: p.divisorHoras };
  if (p.forma === "misto" && p.base === "mensal") return { salario: p.salario ?? 0, divisorHoras: p.divisorHoras ?? 220 };
  return null;
}

/** Valor principal (centavos) e o rótulo do campo, conforme a forma. */
export function valorPrincipal(p: Pagamento): { rotulo: string; valor: number; campo: "valorHora" | "valorDiaria" | "salario" } | null {
  switch (p.forma) {
    case "hora":
      return { rotulo: "Valor da hora", valor: p.valorHora, campo: "valorHora" };
    case "diaria":
      return { rotulo: "Valor da diária", valor: p.valorDiaria, campo: "valorDiaria" };
    case "mensal":
      return { rotulo: "Salário do mês", valor: p.salario, campo: "salario" };
    case "misto":
      return p.base === "hora"
        ? { rotulo: "Valor da hora", valor: p.valorHora ?? 0, campo: "valorHora" }
        : p.base === "diaria"
          ? { rotulo: "Valor da diária", valor: p.valorDiaria ?? 0, campo: "valorDiaria" }
          : { rotulo: "Salário do mês", valor: p.salario ?? 0, campo: "salario" };
    default:
      return null;
  }
}

export const NOME_FORMA: Record<Forma, string> = {
  hora: "Por hora",
  diaria: "Por dia",
  mensal: "Salário fixo",
  producao: "Por produção ou empreita",
  misto: "Hora + produção",
  "misto-mensal": "Salário + produção",
};

export function centavosParaTexto(c: number): string {
  return c > 0 ? (c / 100).toFixed(2).replace(".", ",") : "";
}
