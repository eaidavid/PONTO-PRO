import { describe, expect, it } from "vitest";
import { analisarDia, saldoDoDia } from "../src/calculo/dia";
import { calcularPeriodo, extratoDoPeriodo, ganhoDoDia, tarifaDoPerfil } from "../src/calculo/periodo";
import { escalaPreset } from "../src/escala";
import { dia, perfilJose, SEMANA, semanaJose } from "./ajuda";

const cod = (r: ReturnType<typeof calcularPeriodo>, c: string) => r.ganhos.find((l) => l.codigo === c);

describe("análise do dia", () => {
  const p = perfilJose();

  it("separa normal, excedente e acima do limite diário", () => {
    const a = analisarDia(p, "2026-10-26", dia("2026-10-26", "06:00", "12:00", "13:00", "18:00"), undefined);
    expect(a.trabalhadoMin).toBe(660);
    expect(a.normalMin).toBe(540);
    expect(a.excedenteMin).toBe(60);
    expect(a.acimaLimiteMin).toBe(60);
    expect(saldoDoDia(a)).toBe(120);
  });

  it("dia em andamento e dia incompleto não geram falta", () => {
    const andamento = analisarDia(p, "2026-11-09", dia("2026-11-09", "07:02"), undefined, { agoraMin: 9 * 60 + 41 });
    expect(andamento.emAndamento).toBe(true);
    expect(andamento.trabalhadoMin).toBe(159);
    expect(andamento.deficitMin).toBe(0);
    expect(saldoDoDia(andamento)).toBe(0);
    const incompleto = analisarDia(p, "2026-11-05", dia("2026-11-05", "07:00", "12:00"), undefined);
    expect(incompleto.incompleto).toBe(true);
    expect(incompleto.deficitMin).toBe(0);
  });

  it("dia sem registro não vira falta; falta conta o previsto", () => {
    const vazio = analisarDia(p, "2026-11-05", undefined, undefined);
    expect(vazio.deficitMin).toBe(0);
    expect(saldoDoDia(vazio)).toBe(0);
    const falta = analisarDia(p, "2026-11-05", dia("2026-11-05", undefined, undefined, undefined, undefined, "falta"), undefined);
    expect(falta.deficitMin).toBe(540);
    expect(saldoDoDia(falta)).toBe(-540);
  });

  it("atestado, folga, compensado e feriado manual", () => {
    const at = analisarDia(p, "2026-11-05", dia("2026-11-05", "07:00", undefined, undefined, "09:00", "atestado"), undefined);
    expect(at.abonoMin).toBe(540);
    expect(at.trabalhadoMin).toBe(0);
    const atSab = analisarDia(p, "2026-11-07", dia("2026-11-07", undefined, undefined, undefined, undefined, "atestado"), undefined);
    expect(atSab.abonoMin).toBe(0);
    const folga = analisarDia(p, "2026-11-05", dia("2026-11-05", "07:00", undefined, undefined, "11:00", "folga"), undefined);
    expect(folga.foraEscalaMin).toBe(240);
    expect(folga.previstoMin).toBe(0);
    const comp = analisarDia(p, "2026-11-05", dia("2026-11-05", undefined, undefined, undefined, undefined, "compensado"), undefined);
    expect(comp.debitoBancoMin).toBe(540);
    const fer = analisarDia(p, "2026-11-05", dia("2026-11-05", undefined, undefined, undefined, undefined, "feriado"), undefined);
    expect(fer.categoria).toBe("feriado");
    expect(fer.feriado).toBe("Feriado");
    expect(fer.abonoMin).toBe(540);
  });

  it("categoria pelo dia da semana", () => {
    expect(analisarDia(p, "2026-11-08", undefined, undefined).categoria).toBe("domingo");
    expect(analisarDia(p, "2026-11-07", undefined, undefined).categoria).toBe("sabado");
  });
});

describe("compensação semanal", () => {
  const registros = [
    dia("2026-10-26", "07:00", "12:00", "13:00", "18:00"), // 10h (+1)
    dia("2026-10-27", "07:00", "12:00", "13:00", "16:00"), // 8h (−1)
  ];

  it("ligada: hora a mais cobre hora a menos, sem extra", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: SEMANA, registros });
    expect(r.horas.extraMin).toBe(0);
    expect(r.horas.deficitMin).toBe(0);
    expect(r.horas.normalMin).toBe(1080);
    expect(r.dias.find((d) => d.data === "2026-10-26")!.compensadoMin).toBe(60);
  });

  it("desligada: 1h extra e 1h a menos", () => {
    const p = perfilJose();
    p.jornada.compensacaoSemanal = false;
    const r = calcularPeriodo({ perfil: p, periodo: SEMANA, registros });
    expect(r.horas.extraMin).toBe(60);
    expect(r.horas.deficitMin).toBe(60);
    expect(cod(r, "020")!.valor).toBe(3_750);
  });

  it("limite semanal transforma o que passar em extra", () => {
    const p = perfilJose();
    p.jornada.limiteSemanalMin = 40 * 60;
    const r = calcularPeriodo({ perfil: p, periodo: SEMANA, registros: semanaJose() });
    expect(r.horas.normalMin).toBe(2400);
    expect(r.horas.extraMin).toBe(240);
    expect(cod(r, "020")!.referencia).toBe("4h00");
  });
});

describe("saldo de horas (banco)", () => {
  it("guarda extra e desconta falta e dia compensado", () => {
    const p = perfilJose({ bancoHoras: { ativo: true, pagaDomingoFeriado: true, limiteMin: 60 } });
    p.jornada.compensacaoSemanal = false;
    const r = calcularPeriodo({
      perfil: p,
      periodo: { inicio: "2026-10-25", fim: "2026-11-07" },
      registros: [
        dia("2026-10-26", "07:00", "12:00", "13:00", "20:00"), // +3h
        dia("2026-10-27", "07:00", "12:00", "13:00", "16:00"), // −1h
        dia("2026-11-01", "07:00", undefined, undefined, "12:00"), // domingo: pago
        dia("2026-11-03", undefined, undefined, undefined, undefined, "compensado"), // −9h
      ],
    });
    expect(r.saldoBancoMin).toBe(180 - 60 - 540);
    expect(cod(r, "022")!.valor).toBe(25_000);
    expect(cod(r, "020")).toBeUndefined();
    expect(extratoDoPeriodo(r).some((l) => l.texto.startsWith("Saldo de horas no período: -7h00"))).toBe(true);
  });

  it("avisa quando passa do limite e pode guardar domingo também", () => {
    const p = perfilJose({ bancoHoras: { ativo: true, pagaDomingoFeriado: false, limiteMin: 60 } });
    const r = calcularPeriodo({
      perfil: p,
      periodo: SEMANA,
      registros: [dia("2026-10-25", "07:00", undefined, undefined, "12:00")],
    });
    expect(r.saldoBancoMin).toBe(300);
    expect(r.ganhos).toHaveLength(0);
    expect(r.avisos.map((a) => a.id)).toContain("saldo-acima-limite");
  });
});

describe("formas de pagamento", () => {
  it("mensal: salário inteiro, faltas descontadas e proporcional até hoje", () => {
    const p = perfilJose({ pagamento: { forma: "mensal", salario: 220_000, divisorHoras: 220 } });
    const periodo = { inicio: "2026-10-21", fim: "2026-11-20" };
    const r = calcularPeriodo({
      perfil: p,
      periodo,
      registros: [dia("2026-10-26", undefined, undefined, undefined, undefined, "falta"), dia("2026-11-02", "07:00", undefined, undefined, "12:00")],
    });
    expect(cod(r, "001")!.valor).toBe(220_000);
    expect(cod(r, "010")).toBeUndefined(); // feriado já está no salário
    expect(cod(r, "023")!.valor).toBe(10_000); // 5h × R$ 10,00 + 100%
    expect(r.descontos[0]!.descricao).toBe("Faltas e atrasos");
    expect(r.descontos[0]!.valor).toBe(9_000);
    const parcial = calcularPeriodo({ perfil: p, periodo, proporcionalAte: "2026-10-31" });
    expect(cod(parcial, "001")!.valor).toBeLessThan(220_000);
    expect(cod(parcial, "001")!.referencia).toContain(" de ");
  });

  it("mensal num dia: vira horas × valor da hora", () => {
    const p = perfilJose({ pagamento: { forma: "mensal", salario: 220_000, divisorHoras: 220 } });
    const r = ganhoDoDia({ perfil: p, data: "2026-10-26", registros: [dia("2026-10-26", "07:00", "12:00", "13:00", "17:00")] });
    expect(r.bruto).toBe(9_000);
    expect(r.descontos).toHaveLength(0);
  });

  it("diária: um dia trabalhado vale uma diária; extra pela hora da diária", () => {
    const p = perfilJose({ pagamento: { forma: "diaria", valorDiaria: 16_000, horasDiariaMin: 480 }, escala: escalaPreset("seg-sex-40") });
    p.jornada.compensacaoSemanal = false;
    const r = calcularPeriodo({
      perfil: p,
      periodo: SEMANA,
      registros: [
        dia("2026-10-26", "08:00", "12:00", "13:00", "18:00"),
        dia("2026-10-27", "08:00", "12:00", "13:00", "17:00"),
        dia("2026-10-28", undefined, undefined, undefined, undefined, "atestado"),
      ],
    });
    expect(cod(r, "003")!.valor).toBe(32_000);
    expect(cod(r, "011")!.valor).toBe(16_000);
    expect(cod(r, "020")!.valor).toBe(3_000); // 1h × R$ 20,00 + 50%
    expect(tarifaDoPerfil(p)).toEqual({ num: 16_000, den: 480 });
  });

  it("hora com atestado paga as horas do dia", () => {
    const r = calcularPeriodo({
      perfil: perfilJose(),
      periodo: SEMANA,
      registros: [dia("2026-10-28", undefined, undefined, undefined, undefined, "atestado")],
    });
    expect(cod(r, "011")!.valor).toBe(22_500);
  });

  it("misto: base por hora + produção", () => {
    const p = perfilJose({ pagamento: { forma: "misto", base: "hora", valorHora: 2000 }, producao: { ativo: false, pacotes: [] } });
    const r = calcularPeriodo({
      perfil: p,
      periodo: SEMANA,
      registros: semanaJose(),
      itens: [{ id: "x", nome: "Ponto de tomada", area: "Elétrica", unidade: "pt", preco: 6000, exemplo: true }],
      lancamentos: [
        { id: "1", data: "2026-10-27", itemId: "x", quantidade: 2, precoUnitario: 6000 },
        { id: "2", data: "2026-10-28", itemId: "x", quantidade: 1, precoUnitario: 6000 },
        { id: "3", data: "2026-10-29", itemId: "x", quantidade: 1, precoUnitario: 7000 },
        { id: "4", data: "2026-09-01", itemId: "x", quantidade: 9, precoUnitario: 6000 },
        { id: "5", data: "2026-10-29", itemId: "sumiu", quantidade: 1, precoUnitario: 100 },
      ],
    });
    const prod = r.ganhos.filter((l) => l.tipo === "producao");
    expect(prod.map((l) => l.valor)).toEqual([18_000, 7_000, 100]);
    expect(prod[0]!.referencia).toBe("3 pt");
    expect(prod[2]!.descricao).toBe("Serviço");
    expect(cod(r, "002")!.valor).toBe(88_000);
  });

  it("misto por diária e por mensal", () => {
    const d = perfilJose({ pagamento: { forma: "misto", base: "diaria", valorDiaria: 20_000, horasDiariaMin: 540 } });
    expect(tarifaDoPerfil(d)).toEqual({ num: 20_000, den: 540 });
    const m = perfilJose({ pagamento: { forma: "misto", base: "mensal", salario: 300_000, divisorHoras: 220 } });
    expect(calcularPeriodo({ perfil: m, periodo: SEMANA }).ganhos[0]!.valor).toBe(300_000);
  });

  it("só produção, sem lançamentos, mostra aviso acolhedor", () => {
    const r = calcularPeriodo({ perfil: perfilJose({ pagamento: { forma: "producao" } }), periodo: SEMANA, registros: semanaJose() });
    expect(r.bruto).toBe(0);
    expect(r.avisos[0]!.texto).toBe("Nenhum serviço lançado ainda neste período.");
    expect(tarifaDoPerfil(perfilJose({ pagamento: { forma: "producao" } }))).toBeNull();
  });
});

describe("adicional noturno (12x36)", () => {
  const p = perfilJose({
    pagamento: { forma: "hora", valorHora: 2000 },
    escala: escalaPreset("12x36", "2026-10-26"),
    jornada: { limiteDiarioMin: 720, limiteSemanalMin: 0, compensacaoSemanal: false },
  });
  p.adicionais.noturno.ativo = true;
  const registros = [dia("2026-10-26", "19:00", "01:00", "02:00", "07:00")];

  it("paga 20% sobre as horas entre 22h e 5h", () => {
    const r = calcularPeriodo({ perfil: p, periodo: SEMANA, registros });
    expect(r.horas.noturnoMin).toBe(360);
    expect(cod(r, "030")!.valor).toBe(2_400); // 6h × R$ 20,00 × 20%
    expect(cod(r, "002")!.valor).toBe(22_000); // 11h normais
  });

  it("hora reduzida paga a diferença", () => {
    const q = structuredClone(p);
    q.adicionais.noturno.horaReduzida = true;
    const r = calcularPeriodo({ perfil: q, periodo: SEMANA, registros });
    expect(cod(r, "031")!.referencia).toBe("0h51"); // 360 × 60/52,5 = 411,4 → 51 min
  });
});

describe("descontos e avisos", () => {
  it("fixo e percentual; avisa quando os descontos passam do ganho", () => {
    const p = perfilJose({
      descontos: [
        { id: "a", nome: "Adiantamento", tipo: "fixo", valor: 50_000 },
        { id: "b", nome: "INSS", tipo: "percentual", valor: 9 },
      ],
    });
    const r = calcularPeriodo({ perfil: p, periodo: SEMANA, registros: [dia("2026-10-26", "07:00", "12:00", "13:00", "17:00")] });
    expect(r.descontos.map((d) => d.valor)).toEqual([50_000, 2_025]);
    expect(r.liquido).toBe(22_500 - 52_025);
    expect(r.avisos[0]!.texto).toBe("Os descontos estão maiores que o que você ganhou neste período. Confira em Ajustes.");
    const ext = extratoDoPeriodo(r);
    expect(ext[0]).toEqual({ texto: "Período 25/10 a 31/10", tipo: "titulo" });
    expect(ext.find((l) => l.tipo === "desconto")!.texto).toBe("Adiantamento (valor fixo) = −R$ 500,00");
    expect(ext.at(-1)!.texto).toContain("Você deve receber");
  });

  it("avisa dia sem saída", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: SEMANA, registros: [dia("2026-10-26", "07:00")] });
    expect(r.avisos.map((a) => a.id)).toEqual(["dia-incompleto"]);
  });

  it("ganho de hoje com o relógio andando", () => {
    const r = ganhoDoDia({
      perfil: perfilJose(),
      data: "2026-11-09",
      registros: [dia("2026-11-09", "07:02")],
      agora: { data: "2026-11-09", minutos: 9 * 60 + 41, hora: "09:41" },
    });
    expect(r.bruto).toBe(6_625); // 2h39 × R$ 25,00
  });
});
