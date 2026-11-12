import { type DiaEscala, type DiaRegistro, formatarHorasCurto, formatarReais, type ItemProducao, type LancamentoProducao, type Marcacoes, minParaHora, horaParaMin, PerfilTrabalho, type TipoDia } from "@ponto-pro/core";

/*
 * Importação do "Ponto Pro" antigo (o protótipo de uma página só, que guardava tudo no navegador
 * com a chave "ponto-v2"). Converte para o formato do Pingou sem gravar nada: quem chama mostra a
 * prévia e grava com as ações de sempre (que também entram na fila de sincronização).
 */

/** Formato salvo pelo app antigo. */
interface EstadoAntigo {
  cfg?: { nome?: string; empresa?: string; cargo?: string; fecha?: number; rate?: number; jornada?: number; almoco?: number; x50?: number; x100?: number; inss?: number; outros?: number };
  days?: Record<string, { t?: string[]; type?: string }>;
  prod?: { d?: string; id?: string; q?: number; t?: string }[];
  precos?: Record<string, number>;
  custom?: { id: string; n: string; u: string; a?: string }[];
  uni?: Record<string, string>;
}

/** Catálogo que vinha embutido no app antigo: id → [nome, unidade, área, preço em reais]. */
const CATALOGO_ANTIGO: Record<string, [string, string, string, number]> = (() => {
  const linhas = [
    "#Serviços preliminares", "loc|Locação de obra|m²|3", "esc|Escavação manual de vala|m³|60", "dem|Demolição manual de alvenaria|m²|25",
    "#Fundação e estrutura", "for|Forma de madeira|m²|35", "arm|Armação de aço|kg|3.5", "con|Concretagem|m³|120", "lpm|Laje pré-moldada|m²|40", "brc|Broca ou estaca|m|45",
    "#Alvenaria", "alv|Alvenaria de vedação|m²|35", "ale|Alvenaria estrutural|m²|45", "ver|Verga e contraverga|m|12",
    "#Cobertura", "tel|Estrutura de telhado|m²|40", "tlh|Telhamento|m²|25", "cal|Calha e rufo|m|30",
    "#Revestimentos", "chp|Chapisco|m²|6", "reb|Emboço e reboco|m²|28", "ctp|Contrapiso|m²|25", "ges|Gesso liso|m²|22", "frg|Forro de gesso ou PVC|m²|30",
    "#Pisos e cerâmicas", "pis|Assentamento de piso|m²|35", "azu|Revestimento de parede|m²|40", "rod|Rodapé|m|8", "ban|Bancada de granito|m|60",
    "#Pintura", "mas|Massa corrida|m²|10", "pin|Pintura látex|m²|9", "tex|Textura ou grafiato|m²|14", "esm|Esmalte e verniz|m²|15",
    "#Elétrica", "pto|Ponto de tomada ou interruptor|pt|45", "plz|Ponto de luz|pt|50", "qdr|Quadro de distribuição|un|150", "elt|Eletroduto e fiação|m|6",
    "#Hidráulica e esgoto", "pag|Ponto de água|pt|60", "pes|Ponto de esgoto|pt|60", "lou|Louças e metais|un|80", "cxa|Caixa d’água|un|150", "tub|Tubulação de esgoto|m|18",
    "#Impermeabilização", "imp|Impermeabilização|m²|30",
    "#Esquadrias e serralheria", "prt|Instalação de porta|un|90", "jan|Instalação de janela|un|80", "grd|Portão e grades|m²|70",
    "#Externos e acabamento", "mur|Muro de fechamento|m²|38", "clc|Calçada de concreto|m²|40", "fos|Fossa e sumidouro|un|400", "lim|Limpeza pós-obra|m²|4",
  ];
  const mapa: Record<string, [string, string, string, number]> = {};
  let area = "";
  for (const l of linhas) {
    if (l.startsWith("#")) area = l.slice(1);
    else {
      const [id, nome, unidade, preco] = l.split("|") as [string, string, string, string];
      mapa[id] = [nome, unidade, area, Number(preco)];
    }
  }
  return mapa;
})();

/**
 * Dias de exemplo que o app antigo gravava sozinho na primeira abertura.
 * Só contam como exemplo quando os horários são exatamente os de exemplo.
 */
const F = ["07:00", "12:00", "13:00", "17:00"];
const L = ["07:00", "12:00", "13:00", "18:00"];
const H = ["07:00", "", "", "12:00"];
const S = ["07:00", "12:00", "13:00", "16:00"];
const EXEMPLOS: Record<string, { t: string[]; tipo: string }> = {
  "2026-10-20": { t: F, tipo: "normal" }, "2026-10-21": { t: F, tipo: "normal" }, "2026-10-22": { t: F, tipo: "normal" },
  "2026-10-24": { t: H, tipo: "normal" }, "2026-10-26": { t: L, tipo: "normal" }, "2026-10-27": { t: F, tipo: "normal" },
  "2026-10-28": { t: L, tipo: "normal" }, "2026-10-29": { t: L, tipo: "normal" }, "2026-10-31": { t: H, tipo: "normal" },
  "2026-11-02": { t: H, tipo: "feriado" }, "2026-11-03": { t: F, tipo: "normal" },
  "2026-10-23": { t: S, tipo: "normal" }, "2026-10-30": { t: S, tipo: "normal" }, "2026-11-04": { t: F, tipo: "normal" }, "2026-11-05": { t: F, tipo: "normal" },
};

const TIPOS: Record<string, TipoDia> = { normal: "normal", falta: "falta", atestado: "atestado", feriado: "feriado", folga: "folga" };
const UNIDADES: Record<string, string> = { "m²": "m2", "m³": "m3", "peça": "peca" };
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface ImportacaoAntiga {
  registros: DiaRegistro[];
  itensNovos: ItemProducao[];
  lancamentos: LancamentoProducao[];
  pessoal: { nome?: string; empresa?: string; cargo?: string };
  /** Regras de cálculo do app antigo (valor da hora, jornada, adicionais, descontos). */
  regras: RegrasAntigas | null;
  resumo: {
    /** Dias que entram. */
    dias: number;
    /** Dias que já têm registro no Pingou (ficam como estão). */
    jaExistem: number;
    /** Dias de exemplo do app antigo deixados de fora. */
    exemplos: number;
    lancamentos: number;
    /** Linhas que não deu para entender. */
    ignorados: number;
    primeiro: string | null;
    ultimo: string | null;
  };
}

/** Lê o texto colado (o "pacote" exportado pelo app antigo ou o estado puro) e converte. */
export function converterPontoAntigo(
  texto: string,
  atual: { itens: ItemProducao[]; datasComRegistro: Iterable<string> },
  opcoes: { incluirExemplos?: boolean } = {},
): ImportacaoAntiga {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto.trim());
  } catch {
    throw new Error("Esse texto não é a cópia dos dados do Ponto Pro antigo. Copie de novo pelo botão do app antigo.");
  }
  const pacote = (bruto ?? {}) as { app?: string; estado?: EstadoAntigo } & EstadoAntigo;
  const estado: EstadoAntigo = pacote.app === "Ponto Pro antigo" && pacote.estado ? pacote.estado : pacote;
  if (!estado || typeof estado !== "object" || (!estado.days && !estado.prod)) {
    throw new Error("Não achei registros de ponto nesse texto. Copie de novo pelo botão do app antigo.");
  }

  const existentes = new Set(atual.datasComRegistro);
  let ignorados = 0;
  let jaExistem = 0;
  let exemplos = 0;

  // ---------- ponto ----------
  const registros: DiaRegistro[] = [];
  for (const [data, dia] of Object.entries(estado.days ?? {})) {
    if (!DATA.test(data) || !dia || typeof dia !== "object") {
      ignorados++;
      continue;
    }
    const t = Array.isArray(dia.t) ? dia.t.map((h) => (typeof h === "string" && HORA.test(h) ? h : "")) : ["", "", "", ""];
    const tipo = TIPOS[dia.type ?? "normal"] ?? "normal";
    const ex = EXEMPLOS[data];
    if (!opcoes.incluirExemplos && ex && ex.tipo === tipo && ex.t.every((h, i) => (t[i] ?? "") === h)) {
      exemplos++;
      continue;
    }
    const [entrada, almoco, volta, saida] = t;
    const marcacoes: Marcacoes = {
      ...(entrada ? { entrada } : {}),
      ...(almoco ? { almoco } : {}),
      ...(volta ? { volta } : {}),
      ...(saida ? { saida } : {}),
    };
    if (tipo === "normal" && Object.keys(marcacoes).length === 0) continue; // dia vazio
    if (existentes.has(data)) {
      jaExistem++;
      continue;
    }
    registros.push({ data, tipo, marcacoes });
  }
  registros.sort((a, b) => a.data.localeCompare(b.data));

  // ---------- serviços ----------
  const precoReais = (id: string, padrao: number) => {
    const p = estado.precos?.[id];
    return typeof p === "number" && p >= 0 ? p : padrao;
  };
  const porNome = new Map(atual.itens.map((i) => [`${normalizar(i.nome)}|${i.unidade}`, i]));
  const itensNovos: ItemProducao[] = [];
  /** id antigo → item do Pingou (existente ou novo). */
  const destino = new Map<string, ItemProducao>();
  const itemDe = (idAntigo: string): ItemProducao | null => {
    const ja = destino.get(idAntigo);
    if (ja) return ja;
    const cat = CATALOGO_ANTIGO[idAntigo];
    const custom = estado.custom?.find((c) => c.id === idAntigo);
    if (!cat && !custom) return null;
    const nome = (custom?.n ?? cat![0]).trim().slice(0, 80);
    const unidadeAntiga = estado.uni?.[idAntigo] ?? custom?.u ?? cat![1];
    const unidade = (UNIDADES[unidadeAntiga] ?? unidadeAntiga).trim().slice(0, 12) || "un";
    const area = (custom?.a ?? cat?.[2] ?? "Meus serviços").trim().slice(0, 40) || "Meus serviços";
    const preco = Math.round(precoReais(idAntigo, cat?.[3] ?? 0) * 100);
    const existente = porNome.get(`${normalizar(nome)}|${unidade}`);
    const item: ItemProducao = existente ?? { id: `antigo-${idAntigo}`, nome: nome.length >= 2 ? nome : `${nome} (serviço)`, area, unidade, preco, exemplo: false };
    if (!existente) {
      itensNovos.push(item);
      porNome.set(`${normalizar(nome)}|${unidade}`, item);
    }
    destino.set(idAntigo, item);
    return item;
  };

  // ---------- produção ----------
  const lancamentos: LancamentoProducao[] = [];
  (estado.prod ?? []).forEach((p, n) => {
    const item = p && typeof p.id === "string" ? itemDe(p.id) : null;
    const qtd = typeof p?.q === "number" ? Math.round(p.q * 1000) / 1000 : NaN;
    if (!item || !p.d || !DATA.test(p.d) || !(qtd > 0) || qtd > 1_000_000) {
      ignorados++;
      return;
    }
    const preco = Math.round(precoReais(p.id!, CATALOGO_ANTIGO[p.id!]?.[3] ?? 0) * 100);
    lancamentos.push({
      id: `antigo-${p.d}-${n}`,
      data: p.d,
      itemId: item.id,
      quantidade: qtd,
      precoUnitario: preco,
      ...(p.t ? { descricao: String(p.t).slice(0, 200) } : {}),
    });
  });

  // ---------- dados pessoais ----------
  const limpa = (s?: string) => (typeof s === "string" && s.trim() ? s.trim().slice(0, 80) : undefined);
  const pessoal = {
    ...(limpa(estado.cfg?.nome) ? { nome: limpa(estado.cfg?.nome) } : {}),
    ...(limpa(estado.cfg?.empresa) ? { empresa: limpa(estado.cfg?.empresa) } : {}),
    ...(limpa(estado.cfg?.cargo) ? { cargo: limpa(estado.cfg?.cargo) } : {}),
  };

  const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);
  const c = estado.cfg ?? {};
  const rate = num(c.rate, 0.01, 10_000);
  const jornada = num(c.jornada, 0.5, 24);
  const regras: RegrasAntigas | null =
    rate && jornada
      ? {
          valorHora: Math.round(rate * 100),
          jornadaMin: Math.round(jornada * 60),
          almocoMin: Math.round(num(c.almoco, 0, 240) ?? 60),
          diaFechamento: Math.round(num(c.fecha, 1, 28) ?? 20),
          extraDiaUtil: num(c.x50, 0, 300) ?? 50,
          extraFimDeSemana: num(c.x100, 0, 300) ?? 100,
          descontoPct: num(c.inss, 0, 100) ?? 0,
          outrosDescontos: Math.round((num(c.outros, 0, 1_000_000) ?? 0) * 100),
        }
      : null;

  const datas = [...registros.map((r) => r.data), ...lancamentos.map((l) => l.data)].sort();
  return {
    registros,
    itensNovos,
    lancamentos,
    pessoal,
    regras,
    resumo: {
      dias: registros.length,
      jaExistem,
      exemplos,
      lancamentos: lancamentos.length,
      ignorados,
      primeiro: datas[0] ?? null,
      ultimo: datas.at(-1) ?? null,
    },
  };
}

// ---------- regras de cálculo ----------

export interface RegrasAntigas {
  valorHora: number;
  jornadaMin: number;
  almocoMin: number;
  diaFechamento: number;
  /** % da hora extra em dia útil. */
  extraDiaUtil: number;
  /** % de sábado, domingo e feriado (o app antigo usava um só). */
  extraFimDeSemana: number;
  /** % fixo de desconto (o app antigo chamava de "INSS/IR"). */
  descontoPct: number;
  /** Outros descontos fixos (centavos). */
  outrosDescontos: number;
}

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function resumoEscala(p: PerfilTrabalho): string {
  if (p.escala.tipo !== "semanal") return "escala de revezamento";
  const dias = p.escala.dias;
  const total = dias.reduce((t, d) => t + (d.trabalha ? d.horasLiquidasMin : 0), 0);
  const trabalha = dias.map((d, i) => (d.trabalha ? `${DIAS_SEMANA[i]!.slice(0, 3)} ${formatarHorasCurto(d.horasLiquidasMin)}` : null)).filter(Boolean);
  return `${formatarHorasCurto(total)} por semana (${trabalha.join(", ")})`;
}

function resumoDescontos(p: PerfilTrabalho): string {
  if (p.descontos.length === 0) return "nenhum";
  return p.descontos
    .map((d) =>
      d.tipo === "percentual" ? `${d.nome} ${d.valor}%` : d.tipo === "fixo" ? `${d.nome} ${formatarReais(d.valor)}` : d.tipo === "inss" ? "INSS pela tabela" : d.tipo === "irrf" ? "imposto de renda pela tabela" : d.nome,
    )
    .join(", ");
}

/**
 * Perfil do Pingou ajustado para calcular como o app antigo:
 * pagamento por hora, segunda a sexta com a mesma jornada, sábado e domingo inteiros como extra,
 * o mesmo adicional para fim de semana e feriado, desconto em % fixo e sem folga remunerada sobre extra.
 * Devolve também a lista de mudanças em português, para a pessoa conferir antes.
 */
export function aplicarRegrasAntigas(atual: PerfilTrabalho, r: RegrasAntigas): { perfil: PerfilTrabalho; mudancas: string[] } {
  const p = structuredClone(atual);
  const mudancas: string[] = [];

  // pagamento
  const pg = atual.pagamento;
  if (pg.forma !== "hora") mudancas.push(`Forma de pagamento: passa a ser por hora, ${formatarReais(r.valorHora)}`);
  else if (pg.valorHora !== r.valorHora) mudancas.push(`Valor da hora: ${formatarReais(pg.valorHora)} → ${formatarReais(r.valorHora)}`);
  p.pagamento = { forma: "hora", valorHora: r.valorHora };

  // período
  if (atual.ciclo.diaFechamento !== r.diaFechamento) mudancas.push(`O período fecha no dia ${atual.ciclo.diaFechamento} → dia ${r.diaFechamento}`);
  p.ciclo = { diaFechamento: r.diaFechamento };

  // escala: segunda a sexta com a jornada; sábado e domingo de folga (trabalho neles vira extra)
  const antigaEscala = atual.escala.tipo === "semanal" ? atual.escala.dias : null;
  const dias: DiaEscala[] = Array.from({ length: 7 }, (_, i) => {
    if (i === 0 || i === 6) return { trabalha: false, almocoMin: 0, horasLiquidasMin: 0 };
    const inicio = antigaEscala?.[i]?.inicio ?? "07:00";
    return { trabalha: true, inicio, fim: minParaHora((horaParaMin(inicio) + r.jornadaMin + r.almocoMin) % 1440), almocoMin: r.almocoMin, horasLiquidasMin: r.jornadaMin };
  });
  p.escala = { tipo: "semanal", preset: "personalizada", dias };
  const antes = resumoEscala(atual);
  const depois = resumoEscala(p);
  if (antes !== depois) mudancas.push(`Sua semana: ${antes} → ${depois}; sábado e domingo contam como hora extra`);
  p.jornada = { limiteDiarioMin: r.jornadaMin, limiteSemanalMin: r.jornadaMin * 5, compensacaoSemanal: false };

  // adicionais
  const a = atual.adicionais;
  if (a.extraDiaUtil !== r.extraDiaUtil || a.extraSabado !== r.extraFimDeSemana || a.extraDomingo !== r.extraFimDeSemana || a.extraFeriado !== r.extraFimDeSemana) {
    mudancas.push(`Hora extra: +${r.extraDiaUtil}% em dia útil e +${r.extraFimDeSemana}% em sábado, domingo e feriado`);
  }
  p.adicionais = { ...a, extraDiaUtil: r.extraDiaUtil, extraSabado: r.extraFimDeSemana, extraDomingo: r.extraFimDeSemana, extraFeriado: r.extraFimDeSemana, feriadoTrabalhado: { abonaDia: true } };

  // descontos
  const descontos: PerfilTrabalho["descontos"] = [];
  if (r.descontoPct > 0) descontos.push({ id: "antigo-desconto", nome: "INSS/IR (app antigo)", tipo: "percentual", valor: r.descontoPct });
  if (r.outrosDescontos > 0) descontos.push({ id: "antigo-outros", nome: "Outros descontos", tipo: "fixo", valor: r.outrosDescontos });
  const descAntes = resumoDescontos(atual);
  p.descontos = descontos;
  const descDepois = resumoDescontos(p);
  if (descAntes !== descDepois) mudancas.push(`Descontos: ${descAntes} → ${descDepois}`);

  // o app antigo não tinha folga remunerada sobre extra nem saldo de horas
  if (atual.clt?.dsrSobreExtras) mudancas.push("Folga remunerada sobre hora extra: desligada (o app antigo não calculava)");
  p.clt = { dsrSobreExtras: false };
  if (atual.bancoHoras.ativo) mudancas.push("Saldo de horas: desligado (no app antigo, toda hora extra era paga)");
  p.bancoHoras = { ...atual.bancoHoras, ativo: false };

  // o que veio do app antigo deixa de ser "sugestão"
  const mexidos = ["pagamento", "ciclo", "escala", "jornada", "adicionais", "descontos", "clt", "bancoHoras"];
  p.sugestoes = atual.sugestoes.filter((c) => !mexidos.some((m) => c === m || c.startsWith(`${m}.`)));

  const ok = PerfilTrabalho.safeParse(p);
  if (!ok.success) throw new Error("As regras do app antigo têm algum valor fora do normal. Ajuste em Conta no app antigo e copie de novo.");
  return { perfil: ok.data, mudancas };
}
