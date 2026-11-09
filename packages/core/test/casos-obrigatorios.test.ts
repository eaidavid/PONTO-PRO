import { describe, expect, it } from "vitest";
import { calcularPeriodo } from "../src/calculo/periodo";
import { periodoDaData } from "../src/ciclo";
import { gerarContracheque } from "../src/contracheque";
import { horasSemanais } from "../src/escala";
import { PerfilTrabalho } from "../src/schema/perfil";
import { dia, perfilJose, SEMANA, semanaJose } from "./ajuda";

const linha = (r: ReturnType<typeof calcularPeriodo>, codigo: string) => r.ganhos.find((l) => l.codigo === codigo);

describe("Caso 1 — escala seg a qui 7h–17h e sex 7h–16h = 44h", () => {
  it("soma 9+9+9+9+8 = 44h", () => {
    expect(horasSemanais(perfilJose().escala)).toBe(44 * 60);
  });

  it("com compensação semanal, nenhuma hora de seg a sex é extra", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: SEMANA, registros: semanaJose() });
    expect(r.horas.trabalhadoMin).toBe(2640);
    expect(r.horas.normalMin).toBe(2640);
    expect(r.horas.extraMin).toBe(0);
    expect(r.ganhos.map((l) => l.codigo)).toEqual(["002"]);
    expect(r.bruto).toBe(110_000);
    expect(linha(r, "002")!.conta).toBe("Horas normais 44h × R$ 25,00 = R$ 1.100,00");
  });
});

describe("Caso 2 — sábado 7h–12h fora da jornada é hora extra", () => {
  const registros = [...semanaJose(), dia("2026-10-31", "07:00", undefined, undefined, "12:00")];

  it("com 50%: 5h × R$ 25,00 + 50% = R$ 187,50", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: SEMANA, registros });
    const sab = linha(r, "021")!;
    expect(sab.valor).toBe(18_750);
    expect(sab.referencia).toBe("5h00");
    expect(sab.conta).toBe("Sábado 5h × R$ 25,00 + 50% = R$ 187,50");
    expect(r.horas.extraMin).toBe(300);
    expect(r.bruto).toBe(110_000 + 18_750);
  });

  it("com 100%: R$ 250,00", () => {
    const p = perfilJose();
    p.adicionais.extraSabado = 100;
    const r = calcularPeriodo({ perfil: p, periodo: SEMANA, registros });
    expect(linha(r, "021")!.valor).toBe(25_000);
  });
});

describe("Caso 3 — fechamento no dia 20", () => {
  it("o período vai de 21/10 a 20/11", () => {
    expect(periodoDaData("2026-10-21", 20)).toEqual({ inicio: "2026-10-21", fim: "2026-11-20" });
    expect(periodoDaData("2026-11-20", 20)).toEqual({ inicio: "2026-10-21", fim: "2026-11-20" });
  });

  it("o dia 20/10 pertence ao período anterior", () => {
    expect(periodoDaData("2026-10-20", 20)).toEqual({ inicio: "2026-09-21", fim: "2026-10-20" });
  });
});

describe("Caso 4 — feriado em dia útil (02/11) trabalhado das 7h às 12h", () => {
  it("abono do dia + horas pelo adicional de feriado", () => {
    const r = calcularPeriodo({
      perfil: perfilJose(),
      periodo: { inicio: "2026-11-02", fim: "2026-11-02" },
      registros: [dia("2026-11-02", "07:00", undefined, undefined, "12:00")],
    });
    expect(r.dias[0]!.feriado).toBe("Finados");
    expect(linha(r, "010")!.valor).toBe(22_500); // 9h × R$ 25,00
    expect(linha(r, "023")!.valor).toBe(25_000); // 5h × R$ 25,00 + 100%
    expect(linha(r, "023")!.conta).toBe("Feriado 5h × R$ 25,00 + 100% = R$ 250,00");
    expect(r.bruto).toBe(47_500);
  });

  it("feriado sem trabalhar recebe só o abono; sem abono configurado, nada", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: { inicio: "2026-11-02", fim: "2026-11-02" } });
    expect(r.bruto).toBe(22_500);
    const p = perfilJose();
    p.adicionais.feriadoTrabalhado.abonaDia = false;
    expect(calcularPeriodo({ perfil: p, periodo: { inicio: "2026-11-02", fim: "2026-11-02" } }).bruto).toBe(0);
  });
});

describe("Caso 5 — saldo de horas desligado com sábado pago", () => {
  const registros = [...semanaJose(), dia("2026-10-31", "07:00", undefined, undefined, "12:00")];

  it("saldo fica zero e o sábado é pago", () => {
    const r = calcularPeriodo({ perfil: perfilJose(), periodo: SEMANA, registros });
    expect(r.saldoBancoMin).toBe(0);
    expect(linha(r, "021")!.valor).toBe(18_750);
  });

  it("com saldo ligado, o sábado vai para o saldo e não é pago", () => {
    const p = perfilJose({ bancoHoras: { ativo: true, pagaDomingoFeriado: true } });
    const r = calcularPeriodo({ perfil: p, periodo: SEMANA, registros });
    expect(r.saldoBancoMin).toBe(300);
    expect(linha(r, "021")).toBeUndefined();
  });
});

describe("Caso 6 — produção: 50 m de meio-fio a R$ 12,00", () => {
  const itens = [{ id: "mf", nome: "Assentar meio-fio", area: "Externos e acabamento", unidade: "m", preco: 1200, exemplo: false }];
  const lancamentos = [{ id: "l1", data: "2026-11-05", itemId: "mf", quantidade: 50, precoUnitario: 1200 }];
  const periodo = { inicio: "2026-10-21", fim: "2026-11-20" };

  it("vira provento de R$ 600,00 com o desconto percentual sobre o total", () => {
    const perfil = perfilJose({
      pagamento: { forma: "producao" },
      descontos: [{ id: "d", nome: "INSS aproximado", tipo: "percentual", valor: 9 }],
    });
    const r = calcularPeriodo({ perfil, periodo, itens, lancamentos });
    const prod = r.ganhos.find((l) => l.tipo === "producao")!;
    expect(prod.valor).toBe(60_000);
    expect(prod.conta).toBe("Assentar meio-fio 50 m × R$ 12,00 = R$ 600,00");
    expect(r.descontos[0]!.valor).toBe(5_400);
    expect(r.liquido).toBe(54_600);
    const cc = gerarContracheque(r, { nome: "José" });
    expect(cc.itens.find((i) => i.descricao === "Assentar meio-fio")!.provento).toBe(60_000);
  });

  it("junto com horas, o desconto incide sobre o total ganho", () => {
    const perfil = perfilJose({ descontos: [{ id: "d", nome: "INSS", tipo: "percentual", valor: 10 }] });
    const r = calcularPeriodo({ perfil, periodo: SEMANA, registros: semanaJose(), itens, lancamentos: [{ ...lancamentos[0]!, data: "2026-10-28" }] });
    expect(r.bruto).toBe(110_000 + 60_000);
    expect(r.descontos[0]!.valor).toBe(17_000);
  });
});

describe("Caso 7 — valores negativos ou absurdos são bloqueados", () => {
  const comDesconto = (valor: number, tipo: "percentual" | "fixo" = "percentual") =>
    PerfilTrabalho.safeParse(perfilJose({ descontos: [{ id: "d", nome: "Teste", tipo, valor } as never] }));

  it("desconto percentual entre 0% e 100%", () => {
    expect(comDesconto(0).success).toBe(true);
    expect(comDesconto(100).success).toBe(true);
    const neg = comDesconto(-5);
    expect(neg.success).toBe(false);
    expect(neg.error!.issues[0]!.message).toBe("O desconto deve ficar entre 0% e 100%");
    expect(comDesconto(150).success).toBe(false);
    expect(comDesconto(12.345).success).toBe(false);
  });

  it("desconto fixo, valor da hora e adicionais não aceitam negativo nem absurdo", () => {
    expect(comDesconto(-100, "fixo").success).toBe(false);
    expect(PerfilTrabalho.safeParse(perfilJose({ pagamento: { forma: "hora", valorHora: -2500 } })).success).toBe(false);
    expect(PerfilTrabalho.safeParse(perfilJose({ pagamento: { forma: "hora", valorHora: 25.5 } })).success).toBe(false);
    const p = perfilJose();
    p.adicionais.extraSabado = 500;
    expect(PerfilTrabalho.safeParse(p).success).toBe(false);
    expect(PerfilTrabalho.safeParse(perfilJose({ ciclo: { diaFechamento: 0 } })).success).toBe(false);
  });
});
