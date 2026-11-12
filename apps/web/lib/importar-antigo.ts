import type { DiaRegistro, ItemProducao, LancamentoProducao, Marcacoes, TipoDia } from "@ponto-pro/core";

/*
 * Importação do "Ponto Pro" antigo (o protótipo de uma página só, que guardava tudo no navegador
 * com a chave "ponto-v2"). Converte para o formato do Pingou sem gravar nada: quem chama mostra a
 * prévia e grava com as ações de sempre (que também entram na fila de sincronização).
 */

/** Formato salvo pelo app antigo. */
interface EstadoAntigo {
  cfg?: { nome?: string; empresa?: string; cargo?: string };
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

  const datas = [...registros.map((r) => r.data), ...lancamentos.map((l) => l.data)].sort();
  return {
    registros,
    itensNovos,
    lancamentos,
    pessoal,
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
