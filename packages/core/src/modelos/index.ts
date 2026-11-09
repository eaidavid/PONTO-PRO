import { escalaPreset, horasSemanais, type PresetId } from "../escala";
import { formatarPercentual } from "../dinheiro";
import type { Area, PerfilTrabalho } from "../schema/perfil";
import { formatarHorasCurto } from "../tempo";
import { PACOTES_CONSTRUCAO } from "./catalogo";

export * from "./catalogo";

export const VERSAO_MODELOS = 1;

export type CartaoHoje = "trabalhado" | "saida-prevista" | "ganho-hoje" | "producao-hoje" | "saldo-horas";

export interface Modelo {
  id: Area;
  versao: number;
  nome: string;
  descricao: string;
  /** Quarta aba: Produção ou Metas. */
  abaExtra: "producao" | "metas";
  cartoesHoje: CartaoHoje[];
  perfil: (agoraIso: string) => PerfilTrabalho;
}

/** Valores que todo modelo começa marcando como "Sugestão". */
const SUGESTOES_BASE = [
  "adicionais.extraDiaUtil",
  "adicionais.extraSabado",
  "adicionais.extraDomingo",
  "adicionais.extraFeriado",
  "adicionais.noturno",
  "jornada.limiteDiarioMin",
  "descontos",
];

function perfilBase(area: Area, preset: PresetId, agoraIso: string): PerfilTrabalho {
  const escala = escalaPreset(preset, agoraIso.slice(0, 10));
  return {
    versao: 1,
    id: `perfil-${area}`,
    nome: "Meu trabalho",
    area,
    modelo: { id: area, versao: VERSAO_MODELOS },
    fuso: "America/Sao_Paulo",
    pagamento: { forma: "hora", valorHora: 2500 },
    escala,
    jornada: { limiteDiarioMin: 600, limiteSemanalMin: horasSemanais(escala), compensacaoSemanal: true },
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
    descontos: [{ id: "inss", nome: "INSS aproximado", tipo: "percentual", valor: 9 }],
    producao: { ativo: false, pacotes: [] },
    sugestoes: [...SUGESTOES_BASE],
    atualizadoEm: agoraIso,
  };
}

export const MODELOS: Record<Area, Modelo> = {
  construcao: {
    id: "construcao",
    versao: VERSAO_MODELOS,
    nome: "Construção civil",
    descricao: "Seg a sex 44h, sábado como extra, produção por serviço.",
    abaExtra: "producao",
    cartoesHoje: ["trabalhado", "saida-prevista", "ganho-hoje", "producao-hoje"],
    perfil: (agora) => {
      const p = perfilBase("construcao", "seg-sex-44", agora);
      p.producao = { ativo: true, pacotes: PACOTES_CONSTRUCAO.map((x) => x.id) };
      return p;
    },
  },
  comercio: {
    id: "comercio",
    versao: VERSAO_MODELOS,
    nome: "Comércio",
    descricao: "Escala 6x1, saldo de horas ligado, domingo e feriado em destaque.",
    abaExtra: "metas",
    cartoesHoje: ["trabalhado", "saida-prevista", "saldo-horas", "ganho-hoje"],
    perfil: (agora) => {
      const p = perfilBase("comercio", "6x1", agora);
      p.pagamento = { forma: "mensal", salario: 200_000, divisorHoras: 220 };
      p.bancoHoras = { ativo: true, pagaDomingoFeriado: true };
      p.jornada.compensacaoSemanal = false;
      p.sugestoes.push("pagamento.divisorHoras", "bancoHoras");
      return p;
    },
  },
  saude: {
    id: "saude",
    versao: VERSAO_MODELOS,
    nome: "Saúde",
    descricao: "Plantão 12x36 com adicional noturno.",
    abaExtra: "metas",
    cartoesHoje: ["trabalhado", "saida-prevista", "ganho-hoje"],
    perfil: (agora) => {
      const p = perfilBase("saude", "12x36", agora);
      p.pagamento = { forma: "mensal", salario: 250_000, divisorHoras: 180 };
      p.jornada = { limiteDiarioMin: 720, limiteSemanalMin: 2640, compensacaoSemanal: false };
      p.adicionais.noturno.ativo = true;
      p.sugestoes.push("pagamento.divisorHoras");
      return p;
    },
  },
  transporte: {
    id: "transporte",
    versao: VERSAO_MODELOS,
    nome: "Transporte e entregas",
    descricao: "Por dia ou por corrida, com km opcional.",
    abaExtra: "producao",
    cartoesHoje: ["trabalhado", "ganho-hoje", "producao-hoje"],
    perfil: (agora) => {
      const p = perfilBase("transporte", "seg-sab-44", agora);
      p.pagamento = { forma: "diaria", valorDiaria: 15_000, horasDiariaMin: 480 };
      p.producao = { ativo: true, pacotes: ["transporte.entregas"] };
      p.descontos = [];
      return p;
    },
  },
  servicos: {
    id: "servicos",
    versao: VERSAO_MODELOS,
    nome: "Serviços e diarista",
    descricao: "Por diária ou por visita.",
    abaExtra: "metas",
    cartoesHoje: ["trabalhado", "ganho-hoje"],
    perfil: (agora) => {
      const p = perfilBase("servicos", "seg-sex-40", agora);
      p.pagamento = { forma: "diaria", valorDiaria: 18_000, horasDiariaMin: 480 };
      p.producao = { ativo: false, pacotes: ["servicos.diarista"] };
      p.descontos = [];
      return p;
    },
  },
  outro: {
    id: "outro",
    versao: VERSAO_MODELOS,
    nome: "Autônomo",
    descricao: "Por hora ou por projeto.",
    abaExtra: "metas",
    cartoesHoje: ["trabalhado", "ganho-hoje"],
    perfil: (agora) => {
      const p = perfilBase("outro", "seg-sex-40", agora);
      p.pagamento = { forma: "hora", valorHora: 4000 };
      p.jornada.compensacaoSemanal = false;
      p.descontos = [];
      return p;
    },
  },
};

/** Remove o selo "Sugestão" de um campo quando a pessoa edita. */
export function confirmarCampo(perfil: PerfilTrabalho, caminho: string): PerfilTrabalho {
  return { ...perfil, sugestoes: perfil.sugestoes.filter((s) => s !== caminho && !s.startsWith(`${caminho}.`)) };
}

export function ehSugestao(perfil: PerfilTrabalho, caminho: string): boolean {
  return perfil.sugestoes.some((s) => s === caminho || caminho.startsWith(`${s}.`));
}

/** Frase do resumo: "Sua semana: 44h. Sábado conta como hora extra a 50%." */
export function resumoDoPerfil(perfil: PerfilTrabalho): string {
  const total = horasSemanais(perfil.escala);
  const partes = [`Sua semana: ${formatarHorasCurto(total)}.`];
  if (perfil.escala.tipo === "semanal") {
    const sab = perfil.escala.dias[6]!;
    if (!sab.trabalha) partes.push(`Sábado conta como hora extra a ${formatarPercentual(perfil.adicionais.extraSabado)}.`);
  } else {
    partes.push("Escala em plantões.");
  }
  if (perfil.bancoHoras.ativo) partes.push("Horas a mais vão para o saldo de horas.");
  return partes.join(" ");
}

/** Dias da semana que trabalham, para frases ("seg a sex"). */
export function diasTrabalhados(perfil: PerfilTrabalho): number[] {
  if (perfil.escala.tipo !== "semanal") return [];
  return perfil.escala.dias.map((d, i) => (d.trabalha ? i : -1)).filter((i) => i >= 0);
}

