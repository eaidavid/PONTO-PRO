import { describe, expect, it } from "vitest";
import { contaDoDia, divisorDaSemana, DIVISOR_PADRAO, valorDaHoraDoSalario } from "../src/calculadora";
import { calcularPeriodo } from "../src/calculo/periodo";
import { gerarContracheque, nomeArquivoContracheque, pdfContracheque, textoContracheque, textoResumo } from "../src/contracheque";
import { perfilJose, semanaJose } from "./ajuda";

const PERIODO = { inicio: "2026-10-21", fim: "2026-11-20" };
const r = calcularPeriodo({
  perfil: perfilJose({ descontos: [{ id: "d", nome: "INSS", tipo: "percentual", valor: 9 }] }),
  periodo: PERIODO,
  registros: semanaJose(),
});
const cc = gerarContracheque(r, { nome: "José", cargo: "Pedreiro", empresa: "Obra (Centro) \\ São João" });

function texto(bytes: Uint8Array) {
  return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
}

describe("texto para copiar e mandar no WhatsApp", () => {
  it("contracheque: cabeçalho, linhas, totais e aviso", () => {
    const t = textoContracheque(cc, "Pingou");
    expect(t.startsWith(`*Contracheque estimado — ${cc.referencia}*\nJosé · Pedreiro`)).toBe(true);
    expect(t).toContain("INSS");
    expect(t).toMatch(/: −R\$ [\d.,]+/);
    expect(t).toContain("*Líquido: R$");
    expect(t.endsWith("_Estimativa, sem validade legal · Pingou_")).toBe(true);
  });

  it("contracheque sem cargo não deixa separador sobrando", () => {
    const t = textoContracheque(gerarContracheque(r), "Pingou");
    expect(t.split("\n")[1]).toBe("Trabalhador");
  });

  it("resumo: quanto vai pingar, quando e de onde vem", () => {
    const t = textoResumo({
      referencia: "21/10 a 20/11",
      previsto: 512444,
      jaGanhou: 336472,
      quando: "Cai em 05/12 · em 26 dias",
      grupos: [
        { rotulo: "Trabalho na sua semana", valor: 440000 },
        { rotulo: "Descontos", valor: 50681, desconto: true },
      ],
      marca: "Pingou",
    });
    expect(t).toBe(
      [
        "*Meus ganhos — período 21/10 a 20/11*",
        "Vai pingar: *R$ 5.124,44*",
        "Cai em 05/12 · em 26 dias",
        "Já ganhei: R$ 3.364,72",
        "",
        "Trabalho na sua semana: R$ 4.400,00",
        "Descontos: −R$ 506,81",
        "",
        "_Estimativa, sem validade legal · Pingou_",
      ].join("\n"),
    );
  });

  it("resumo sem data de pagamento pula a linha", () => {
    const t = textoResumo({ referencia: "x", previsto: 0, jaGanhou: 0, grupos: [], marca: "P" });
    expect(t).not.toContain("Cai em");
  });
});

describe("PDF do contracheque", () => {
  const pdf = pdfContracheque(cc, "Pingou");
  const s = texto(pdf);

  it("é um PDF válido de uma página", () => {
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(s).toContain("/Count 1");
    expect(s).toContain("/BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding");
  });

  it("a tabela de referências aponta para o início de cada objeto", () => {
    const inicio = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(inicio, inicio + 4)).toBe("xref");
    const offsets = [...s.slice(inicio).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(7);
    offsets.forEach((o, i) => expect(s.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    const tamanho = Number(/\/Length (\d+) >>\nstream\n/.exec(s)![1]);
    const corpo = s.slice(s.indexOf("stream\n") + 7, s.indexOf("\nendstream"));
    expect(corpo.length).toBe(tamanho);
  });

  it("traz os valores, escapa parênteses e barra, e codifica acentos em WinAnsi", () => {
    expect(s).toContain("(Obra \\(Centro\\) \\\\ S\\343o Jo\\343o)");
    expect(s).toContain("(Jos\\351)");
    expect(s).toContain(`(${cc.referencia.replace(/\//g, "/")})`);
    expect(s).toContain("Estimativa, sem validade legal");
  });

  it("todos os bytes cabem em um byte (sem caracteres fora da tabela)", () => {
    expect(pdf.every((b) => b <= 255)).toBe(true);
  });

  it("textos longos são cortados com reticências e caracteres fora da tabela viram ?", () => {
    const longo = pdfContracheque({ ...cc, empresa: "Empreiteira ".repeat(10) + "🙂", funcionario: "Ana 🙂" }, "Pingou");
    const t = texto(longo);
    expect(t).toContain("\\205)"); // reticências (…) em WinAnsi
    expect(t).toContain("(Ana ?)");
  });

  it("contracheque grande avisa as linhas que ficaram de fora", () => {
    const muitas = Array.from({ length: 40 }, (_, n) => ({ ...cc.itens[0]!, codigo: String(n), descricao: `Linha ${n}` }));
    const t = texto(pdfContracheque({ ...cc, itens: muitas, avisos: ["a", "b", "c", "d"] }, "Pingou"));
    expect(t).toMatch(/\+ \d+ linhas no app/);
  });

  it("uma linha de fora fica no singular", () => {
    let pouco = 0;
    let txt = "";
    for (let n = 18; n < 30 && !/\+ 1 linha no app/.test(txt); n++) {
      const itens = Array.from({ length: n }, (_, k) => ({ ...cc.itens[0]!, codigo: String(k), descricao: `L${k}` }));
      txt = texto(pdfContracheque({ ...cc, itens, cargo: "" }, "P"));
      pouco = n;
    }
    expect(txt, `testado até ${pouco} linhas`).toMatch(/\+ 1 linha no app/);
  });

  it("nome do arquivo sem acento nem barra", () => {
    expect(nomeArquivoContracheque(cc)).toMatch(/^contracheque-[a-z0-9-]+\.pdf$/);
    expect(nomeArquivoContracheque({ ...cc, referencia: "Período 21/10 a 20/11" })).toBe("contracheque-periodo-21-10-a-20-11.pdf");
    expect(nomeArquivoContracheque({ ...cc, referencia: "///" })).toBe("contracheque-estimado.pdf");
  });
});

describe("calculadora", () => {
  it("salário → valor da hora e da hora extra", () => {
    expect(valorDaHoraDoSalario(220000)).toEqual({ hora: 1000, extra: 1500, extraDomingo: 2000 });
    expect(valorDaHoraDoSalario(151800, 220, 60, 100).hora).toBe(690);
    expect(valorDaHoraDoSalario(0)).toEqual({ hora: 0, extra: 0, extraDomingo: 0 });
    expect(valorDaHoraDoSalario(100000, 0).hora).toBe(0);
  });

  it("divisor pelas horas da semana", () => {
    expect(divisorDaSemana(44)).toBe(DIVISOR_PADRAO);
    expect(divisorDaSemana(40)).toBe(200);
    expect(divisorDaSemana(36)).toBe(180);
  });

  it("dia comum, com hora extra e virando a meia-noite", () => {
    expect(contaDoDia({ entrada: "07:00", saida: "17:00", almocoMin: 60, jornadaMin: 540, valorHora: 2500 })).toEqual({
      trabalhadoMin: 540,
      normalMin: 540,
      extraMin: 0,
      valor: 22500,
    });
    const extra = contaDoDia({ entrada: "07:00", saida: "18:00", almocoMin: 60, jornadaMin: 480, valorHora: 2500, pctExtra: 100 });
    expect(extra).toEqual({ trabalhadoMin: 600, normalMin: 480, extraMin: 120, valor: 30000 });
    expect(contaDoDia({ entrada: "19:00", saida: "07:00", almocoMin: 60, jornadaMin: 660, valorHora: 2000 }).trabalhadoMin).toBe(660);
    expect(contaDoDia({ entrada: "08:00", saida: "08:30", almocoMin: 60, jornadaMin: 480, valorHora: 2000 }).trabalhadoMin).toBe(0);
  });
});
