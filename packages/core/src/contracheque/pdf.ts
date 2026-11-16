import { formatarReais } from "../dinheiro";
import type { Contracheque } from "./index";

/**
 * PDF do contracheque gerado no próprio aparelho, sem biblioteca e sem internet.
 * Uma página A4 com a fonte Helvetica (embutida em todo leitor de PDF) e acentos em WinAnsi.
 */

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 48;

/** Larguras da Helvetica (em milésimos do tamanho da fonte) para alinhar números à direita. */
const LARGURAS: Record<string, number> = {
  " ": 278, ",": 278, ".": 278, "-": 333, "/": 278, ":": 278, "(": 333, ")": 333, "%": 889, $: 556,
  R: 722, h: 556, m: 833, d: 556, i: 222, a: 556, s: 500, x: 500,
};
/** Negrito: só o que difere da regular entre os caracteres de números e valores. */
const LARGURAS_NEGRITO: Record<string, number> = { R: 722, $: 556, h: 611, m: 889, d: 611, i: 278, a: 556, s: 556, x: 556, ":": 333 };

function larguraTexto(texto: string, tamanho: number, negrito = false): number {
  let soma = 0;
  for (const c of texto) soma += (negrito ? LARGURAS_NEGRITO[c] : undefined) ?? LARGURAS[c] ?? (negrito && !/[0-9]/.test(c) ? 611 : 556); // dígitos: 556; letras: média da fonte
  return (soma * tamanho) / 1000;
}

/** Converte para os bytes WinAnsi; o que não existe nessa tabela vira um equivalente simples. */
function paraWinAnsi(texto: string): number[] {
  const especiais: Record<string, number> = { "—": 0x97, "–": 0x96, "•": 0x95, "“": 0x93, "”": 0x94, "‘": 0x91, "’": 0x92, "…": 0x85, "€": 0x80 };
  const bytes: number[] = [];
  for (const c of texto.replace(/−/g, "-").replace(/×/g, "x").normalize("NFC")) {
    const cod = c.codePointAt(0) ?? 63;
    if (especiais[c] !== undefined) bytes.push(especiais[c]);
    else if (cod < 256) bytes.push(cod);
    else bytes.push(63); // "?"
  }
  return bytes;
}

/** Texto entre parênteses do PDF, com escape de \ ( ) e bytes acima de 127 em octal. */
function literal(texto: string): string {
  return (
    "(" +
    paraWinAnsi(texto)
      .map((b) => {
        if (b === 0x5c || b === 0x28 || b === 0x29) return "\\" + String.fromCharCode(b);
        if (b < 32 || b > 126) return "\\" + b.toString(8).padStart(3, "0");
        return String.fromCharCode(b);
      })
      .join("") +
    ")"
  );
}

/** Corta o texto para caber na largura (com reticências). */
function caber(texto: string, tamanho: number, largura: number, negrito = false): string {
  if (larguraTexto(texto, tamanho, negrito) <= largura) return texto;
  let t = texto;
  while (t.length > 1 && larguraTexto(t + "…", tamanho, negrito) > largura) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

class Pagina {
  readonly ops: string[] = [];
  texto(x: number, y: number, s: string, tamanho = 10, negrito = false, cor: [number, number, number] = [0.07, 0.09, 0.15]) {
    this.ops.push(`BT ${cor.join(" ")} rg /${negrito ? "F2" : "F1"} ${tamanho} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${literal(s)} Tj ET`);
  }
  direita(xDireita: number, y: number, s: string, tamanho = 10, negrito = false, cor?: [number, number, number]) {
    this.texto(xDireita - larguraTexto(s, tamanho, negrito), y, s, tamanho, negrito, cor);
  }
  retangulo(x: number, y: number, l: number, a: number, cor: [number, number, number]) {
    this.ops.push(`${cor.join(" ")} rg ${x} ${y} ${l} ${a} re f`);
  }
  linha(x1: number, y: number, x2: number, cor: [number, number, number] = [0.85, 0.87, 0.86], espessura = 0.6) {
    this.ops.push(`${cor.join(" ")} RG ${espessura} w ${x1} ${y} m ${x2} ${y} l S`);
  }
}

const VERDE: [number, number, number] = [0.027, 0.208, 0.176];
const BRANCO: [number, number, number] = [1, 1, 1];
const CINZA: [number, number, number] = [0.29, 0.33, 0.39];
const VERMELHO: [number, number, number] = [0.73, 0.11, 0.11];

/** Monta o arquivo PDF (bytes) com os objetos e a tabela de referências cruzadas. */
function montarPdf(conteudo: string, titulo: string): Uint8Array {
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGURA} ${ALTURA}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    `<< /Title ${literal(titulo)} /Producer (Pingou) >>`,
  ];
  let saida = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const posicoes: number[] = [];
  objetos.forEach((o, i) => {
    posicoes.push(saida.length);
    saida += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = saida.length;
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const p of posicoes) saida += `${String(p).padStart(10, "0")} 00000 n \n`;
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info ${objetos.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // todo o conteúdo já está em bytes de 0 a 255 (escapes em octal), então 1 caractere = 1 byte
  const bytes = new Uint8Array(saida.length);
  for (let i = 0; i < saida.length; i++) bytes[i] = saida.charCodeAt(i) & 0xff;
  return bytes;
}

/** Contracheque estimado em PDF (A4), pronto para baixar ou compartilhar. */
export function pdfContracheque(cc: Contracheque, marca: string): Uint8Array {
  const p = new Pagina();
  const dir = LARGURA - MARGEM;
  let y = ALTURA - MARGEM;

  // cabeçalho verde
  p.retangulo(MARGEM, y - 70, LARGURA - 2 * MARGEM, 70, VERDE);
  p.texto(MARGEM + 16, y - 26, "Contracheque estimado", 10, true, [0.49, 0.88, 0.76]);
  p.texto(MARGEM + 16, y - 50, caber(cc.empresa, 18, 330, true), 18, true, BRANCO);
  p.direita(dir - 16, y - 26, "Referência", 9, false, BRANCO);
  p.direita(dir - 16, y - 46, cc.referencia, 13, true, BRANCO);
  y -= 96;

  // trabalhador e cargo
  p.texto(MARGEM, y, "Trabalhador", 9, false, CINZA);
  p.texto(MARGEM + 260, y, "Cargo", 9, false, CINZA);
  y -= 16;
  p.texto(MARGEM, y, caber(cc.funcionario, 12, 250, true), 12, true);
  p.texto(MARGEM + 260, y, caber(cc.cargo || "—", 12, 240, true), 12, true);
  y -= 26;

  // tabela
  const col = { cod: MARGEM, desc: MARGEM + 40, ref: MARGEM + 290, prov: dir - 90, descDir: dir };
  p.retangulo(MARGEM, y - 6, LARGURA - 2 * MARGEM, 20, [0.93, 0.94, 0.93]);
  p.texto(col.cod + 4, y, "Cód.", 9, true, CINZA);
  p.texto(col.desc, y, "Descrição", 9, true, CINZA);
  p.texto(col.ref, y, "Referência", 9, true, CINZA);
  p.direita(col.prov, y, "Ganhos", 9, true, CINZA);
  p.direita(col.descDir, y, "Descontos", 9, true, CINZA);
  y -= 22;
  const limiteY = 200;
  const itens = [...cc.itens];
  let omitidos = 0;
  for (const [n, i] of itens.entries()) {
    if (y < limiteY) {
      omitidos = itens.length - n;
      break;
    }
    p.texto(col.cod + 4, y, i.codigo, 10, false, CINZA);
    p.texto(col.desc, y, caber(i.descricao, 10, 240), 10);
    p.texto(col.ref, y, caber(i.referencia, 10, 100), 10, false, CINZA);
    if (i.provento) p.direita(col.prov, y, formatarReais(i.provento), 10);
    if (i.desconto) p.direita(col.descDir, y, formatarReais(i.desconto), 10, false, VERMELHO);
    p.linha(MARGEM, y - 8, dir);
    y -= 22;
  }
  if (omitidos > 0) {
    p.texto(col.desc, y, `+ ${omitidos} ${omitidos === 1 ? "linha" : "linhas"} no app`, 10, false, CINZA);
    y -= 22;
  }

  // totais
  y -= 6;
  p.linha(MARGEM, y + 12, dir, [0.07, 0.09, 0.15], 1.2);
  p.texto(MARGEM, y - 4, "Total de ganhos", 10, false, CINZA);
  p.texto(MARGEM + 170, y - 4, "Total de descontos", 10, false, CINZA);
  p.direita(dir, y - 4, "Líquido estimado", 10, false, CINZA);
  y -= 24;
  p.texto(MARGEM, y, formatarReais(cc.totalProventos), 14, true);
  p.texto(MARGEM + 170, y, formatarReais(cc.totalDescontos), 14, true, VERMELHO);
  p.direita(dir, y - 2, formatarReais(cc.liquido), 20, true, VERDE);
  y -= 40;

  // avisos e rodapé
  for (const a of cc.avisos.slice(0, 3)) {
    p.texto(MARGEM, y, caber(`• ${a}`, 9, LARGURA - 2 * MARGEM), 9, false, CINZA);
    y -= 14;
  }
  p.retangulo(MARGEM, MARGEM, LARGURA - 2 * MARGEM, 30, [1, 0.945, 0.906]);
  p.texto(MARGEM + 12, MARGEM + 11, `${cc.rodape}. Confira sempre com a folha de pagamento oficial.`, 9, true, [0.76, 0.25, 0.05]);
  p.direita(dir - 12, MARGEM + 11, marca, 9, true, [0.76, 0.25, 0.05]);

  return montarPdf(p.ops.join("\n"), `Contracheque estimado ${cc.referencia}`);
}

/** Nome de arquivo seguro: "contracheque-21-10-a-20-11.pdf". */
export function nomeArquivoContracheque(cc: Contracheque): string {
  const ref = cc.referencia
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `contracheque-${ref || "estimado"}.pdf`;
}

// ---------- relatório de horas ----------

export interface DiaRelatorio {
  data: string;
  /** "seg", "ter"... */
  dia: string;
  /** "normal", "falta", "feriado (Natal)"... */
  tipo: string;
  entrada?: string;
  almoco?: string;
  volta?: string;
  saida?: string;
  trabalhadoMin: number;
  extraMin: number;
}

function duracao(min: number): string {
  if (!min) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Relatório de horas do período (A4): todas as marcações, horas trabalhadas e extras por dia e os totais.
 * Para levar ao RH, ao sindicato ou ao advogado. Registro pessoal, não o ponto oficial da empresa.
 */
export function pdfRelatorioHoras(p: { nome: string; referencia: string; dias: DiaRelatorio[]; geradoEm: string; marca: string }): Uint8Array {
  const pg = new Pagina();
  const dir = LARGURA - MARGEM;
  let y = ALTURA - MARGEM;

  pg.retangulo(MARGEM, y - 64, LARGURA - 2 * MARGEM, 64, VERDE);
  pg.texto(MARGEM + 16, y - 24, "Relatório de horas", 10, true, [0.49, 0.88, 0.76]);
  pg.texto(MARGEM + 16, y - 46, caber(p.nome || "Trabalhador", 16, 300, true), 16, true, BRANCO);
  pg.direita(dir - 16, y - 24, "Período", 9, false, BRANCO);
  pg.direita(dir - 16, y - 44, p.referencia, 12, true, BRANCO);
  y -= 86;

  const col = { data: MARGEM, dia: MARGEM + 52, tipo: MARGEM + 84, ent: MARGEM + 190, alm: MARGEM + 236, vol: MARGEM + 282, sai: MARGEM + 328, trab: dir - 60, extra: dir };
  const cab = (s: string, x: number, direita = false) => (direita ? pg.direita(x, y, s, 8, true, CINZA) : pg.texto(x, y, s, 8, true, CINZA));
  cab("Data", col.data);
  cab("Dia", col.dia);
  cab("Tipo", col.tipo);
  cab("Entrada", col.ent);
  cab("Almoço", col.alm);
  cab("Volta", col.vol);
  cab("Saída", col.sai);
  cab("Trabalhado", col.trab, true);
  cab("Extra", col.extra, true);
  y -= 6;
  pg.linha(MARGEM, y, dir);

  const altura = Math.min(18, (y - 130) / Math.max(1, p.dias.length));
  const fonte = altura < 15 ? 8 : 9;
  let total = 0;
  let extras = 0;
  for (const d of p.dias) {
    y -= altura;
    total += d.trabalhadoMin;
    extras += d.extraMin;
    pg.texto(col.data, y, `${d.data.slice(8, 10)}/${d.data.slice(5, 7)}`, fonte);
    pg.texto(col.dia, y, d.dia, fonte, false, CINZA);
    pg.texto(col.tipo, y, caber(d.tipo, fonte, 100), fonte, false, d.tipo === "falta" ? VERMELHO : CINZA);
    pg.texto(col.ent, y, d.entrada ?? "-", fonte);
    pg.texto(col.alm, y, d.almoco ?? "-", fonte);
    pg.texto(col.vol, y, d.volta ?? "-", fonte);
    pg.texto(col.sai, y, d.saida ?? "-", fonte);
    pg.direita(col.trab, y, duracao(d.trabalhadoMin), fonte, true);
    pg.direita(col.extra, y, d.extraMin ? `+${duracao(d.extraMin)}` : "-", fonte, !!d.extraMin);
    pg.linha(MARGEM, y - 5, dir, [0.93, 0.94, 0.93], 0.4);
  }

  y -= 28;
  pg.retangulo(MARGEM, y - 14, LARGURA - 2 * MARGEM, 36, [0.88, 0.95, 0.93]);
  pg.texto(MARGEM + 12, y, "Total no período", 11, true);
  pg.direita(col.trab, y, duracao(total), 11, true);
  pg.direita(col.extra, y, extras ? `+${duracao(extras)}` : "-", 11, true);

  y -= 46;
  pg.texto(MARGEM, y, `Registro pessoal do trabalhador, feito no app ${p.marca} e gerado em ${p.geradoEm}.`, 8, false, CINZA);
  pg.texto(MARGEM, y - 12, "Não substitui o controle de ponto oficial do empregador.", 8, false, CINZA);
  return montarPdf(pg.ops.join("\n"), `Relatório de horas ${p.referencia}`);
}

/** Nome do arquivo: "relatorio-de-horas-2026-10-21-a-2026-11-20.pdf". */
export function nomeArquivoRelatorio(inicio: string, fim: string): string {
  return `relatorio-de-horas-${inicio}-a-${fim}.pdf`;
}
