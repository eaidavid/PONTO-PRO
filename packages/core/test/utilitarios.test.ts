import { describe, expect, it } from "vitest";
import { datasDoPeriodo, periodoDaData, periodoVizinho, rotuloPeriodo } from "../src/ciclo";
import {
  aplicarPercentual,
  arredondar,
  formatarPercentual,
  formatarQuantidade,
  formatarReais,
  formatarReaisCurto,
  lerReais,
  valorAdicional,
  valorHoraDaTarifa,
  valorMinutos,
  valorProducao,
} from "../src/dinheiro";
import { escalaDoDia, escalaPreset, horariosComuns, horasSemanais, marcacoesPrevistas, diaDeTrabalho, FOLGA } from "../src/escala";
import { feriadosDoIntervalo, feriadosNacionais, pascoa, pontosFacultativos } from "../src/feriados";
import {
  agoraEmSaoPaulo,
  dataCurta,
  dataPorExtenso,
  diaDaSemana,
  formatarDuracao,
  formatarHorasCurto,
  horaParaMin,
  inicioDaSemana,
  intervalosTrabalho,
  minParaHora,
  minutosNoturnos,
  proximaEtapa,
  saudacao,
  seloDia,
  somaIntervalos,
  somarDias,
  ultimoDiaDoMes,
} from "../src/tempo";

describe("tempo", () => {
  it("converte horas e durações", () => {
    expect(horaParaMin("07:30")).toBe(450);
    expect(minParaHora(450)).toBe("07:30");
    expect(minParaHora(1500)).toBe("01:00");
    expect(minParaHora(-60)).toBe("23:00");
    expect(formatarDuracao(540)).toBe("9h00");
    expect(formatarDuracao(159)).toBe("2h39");
    expect(formatarDuracao(-30)).toBe("-0h30");
    expect(formatarDuracao(30, { sinal: true })).toBe("+0h30");
    expect(formatarDuracao(0, { sinal: true })).toBe("0h00");
    expect(formatarHorasCurto(540)).toBe("9h");
    expect(formatarHorasCurto(150)).toBe("2h30");
    expect(formatarHorasCurto(-90)).toBe("-1h30");
  });

  it("monta intervalos com almoço, sem almoço, em andamento e passando da meia-noite", () => {
    expect(intervalosTrabalho({ entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:00" })).toEqual([
      { inicio: 420, fim: 720 },
      { inicio: 780, fim: 1020 },
    ]);
    expect(intervalosTrabalho({ entrada: "07:00", saida: "12:00" })).toEqual([{ inicio: 420, fim: 720 }]);
    expect(intervalosTrabalho({ entrada: "07:00" })).toEqual([]);
    expect(intervalosTrabalho({ entrada: "07:00" }, 600)).toEqual([{ inicio: 420, fim: 600 }]);
    expect(intervalosTrabalho({ entrada: "07:00", almoco: "12:00" }, 750)).toEqual([{ inicio: 420, fim: 720 }]);
    expect(intervalosTrabalho({ entrada: "07:00", almoco: "12:00", volta: "13:00" }, 840)).toEqual([
      { inicio: 420, fim: 720 },
      { inicio: 780, fim: 840 },
    ]);
    expect(intervalosTrabalho({ entrada: "07:00", almoco: "12:00", volta: "13:00" })).toEqual([{ inicio: 420, fim: 720 }]);
    expect(intervalosTrabalho({})).toEqual([]);
    const noite = intervalosTrabalho({ entrada: "19:00", almoco: "01:00", volta: "02:00", saida: "07:00" });
    expect(somaIntervalos(noite)).toBe(660);
    expect(intervalosTrabalho({ entrada: "22:00" }, 60)).toEqual([{ inicio: 1320, fim: 1500 }]);
  });

  it("conta minutos noturnos", () => {
    const noite = intervalosTrabalho({ entrada: "19:00", almoco: "01:00", volta: "02:00", saida: "07:00" });
    expect(minutosNoturnos(noite, "22:00", "05:00")).toBe(360); // 22–01 + 02–05
    expect(minutosNoturnos([{ inicio: 420, fim: 1020 }], "22:00", "05:00")).toBe(0);
    expect(minutosNoturnos([{ inicio: 0, fim: 600 }], "08:00", "09:00")).toBe(60);
    expect(minutosNoturnos([{ inicio: 0, fim: 600 }], "08:00", "08:00")).toBe(0);
  });

  it("sabe a próxima etapa do dia", () => {
    expect(proximaEtapa({})).toBe("entrada");
    expect(proximaEtapa({ entrada: "07:00" })).toBe("almoco");
    expect(proximaEtapa({ entrada: "07:00", almoco: "12:00" })).toBe("volta");
    expect(proximaEtapa({ entrada: "07:00", almoco: "12:00", volta: "13:00" })).toBe("saida");
    expect(proximaEtapa({ entrada: "07:00", saida: "12:00" })).toBeNull();
  });

  it("faz contas de data", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(diaDaSemana("2026-11-09")).toBe(1);
    expect(inicioDaSemana("2026-11-11")).toBe("2026-11-08");
    expect(ultimoDiaDoMes(2028, 2)).toBe(29);
    expect(seloDia("2026-11-03")).toBe("ter 03");
    expect(dataCurta("2026-11-03")).toBe("03/11");
    expect(dataPorExtenso("2026-11-09")).toBe("segunda, 09 de novembro");
  });

  it("usa o fuso de São Paulo", () => {
    // 02:30 UTC de 10/11 = 23:30 de 09/11 em São Paulo (UTC-3)
    const a = agoraEmSaoPaulo(new Date("2026-11-10T02:30:00Z"));
    expect(a).toEqual({ data: "2026-11-09", minutos: 23 * 60 + 30, hora: "23:30" });
    expect(agoraEmSaoPaulo(Date.UTC(2026, 10, 9, 12, 41)).hora).toBe("09:41");
    expect(agoraEmSaoPaulo().data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dá a saudação pelo horário", () => {
    expect(saudacao(9 * 60)).toBe("Bom dia");
    expect(saudacao(14 * 60)).toBe("Boa tarde");
    expect(saudacao(20 * 60)).toBe("Boa noite");
    expect(saudacao(3 * 60)).toBe("Boa noite");
  });
});

describe("dinheiro", () => {
  it("formata reais no padrão brasileiro", () => {
    expect(formatarReais(123456)).toBe("R$ 1.234,56");
    expect(formatarReais(5)).toBe("R$ 0,05");
    expect(formatarReais(100_000_000)).toBe("R$ 1.000.000,00");
    expect(formatarReais(-53528)).toBe("−R$ 535,28");
    expect(formatarReais(100, { sinal: true })).toBe("+R$ 1,00");
    expect(formatarReais(0, { sinal: true })).toBe("R$ 0,00");
    expect(formatarReaisCurto(42000)).toBe("R$ 420");
    expect(formatarReaisCurto(42050)).toBe("R$ 420,50");
  });

  it("lê valores digitados", () => {
    expect(lerReais("1.234,56")).toBe(123456);
    expect(lerReais("R$ 25,00")).toBe(2500);
    expect(lerReais("1234,5")).toBe(123450);
    expect(lerReais("1234.56")).toBe(123456);
    expect(lerReais("1.234")).toBe(123400);
    expect(lerReais("25")).toBe(2500);
    expect(lerReais("abc")).toBeNull();
    expect(lerReais("-5")).toBeNull();
  });

  it("arredonda meio para cima, simétrico nos negativos", () => {
    expect(arredondar(2.5)).toBe(3);
    expect(arredondar(-2.5)).toBe(-3);
    expect(arredondar(2.4)).toBe(2);
  });

  it("calcula valores por minuto e percentuais", () => {
    const hora = { num: 2500, den: 60 };
    expect(valorMinutos(300, hora, 50)).toBe(18_750);
    expect(valorMinutos(159, hora)).toBe(6_625);
    expect(valorAdicional(60, hora, 20)).toBe(500);
    expect(valorHoraDaTarifa({ num: 300_000, den: 220 * 60 })).toBe(1364);
    expect(aplicarPercentual(594_758, 9)).toBe(53_528);
    expect(valorProducao(12.5, 4000)).toBe(50_000);
    expect(valorProducao(0.333, 100)).toBe(33);
    expect(formatarPercentual(12.5)).toBe("12,5%");
    expect(formatarQuantidade(1234.5)).toBe("1.234,5");
    expect(formatarQuantidade(50)).toBe("50");
  });
});

describe("período", () => {
  it("vira o ano e trata meses curtos", () => {
    expect(periodoDaData("2026-12-25", 20)).toEqual({ inicio: "2026-12-21", fim: "2027-01-20" });
    expect(periodoDaData("2027-01-05", 20)).toEqual({ inicio: "2026-12-21", fim: "2027-01-20" });
    expect(periodoDaData("2026-02-15", 31)).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
    expect(periodoDaData("2026-03-01", 30)).toEqual({ inicio: "2026-03-01", fim: "2026-03-30" });
    expect(periodoDaData("2026-03-31", 30)).toEqual({ inicio: "2026-03-31", fim: "2026-04-30" });
  });

  it("navega entre períodos e monta o rótulo", () => {
    const p = periodoDaData("2026-11-09", 20);
    expect(rotuloPeriodo(p)).toBe("21/10 a 20/11");
    expect(periodoVizinho(p, -1, 20)).toEqual({ inicio: "2026-09-21", fim: "2026-10-20" });
    expect(periodoVizinho(p, 1, 20)).toEqual({ inicio: "2026-11-21", fim: "2026-12-20" });
    expect(datasDoPeriodo(p)).toHaveLength(31);
  });
});

describe("escala", () => {
  it("tem presets coerentes", () => {
    expect(horasSemanais(escalaPreset("seg-sex-44"))).toBe(2640);
    expect(horasSemanais(escalaPreset("seg-sab-44"))).toBe(2640);
    expect(horasSemanais(escalaPreset("6x1"))).toBe(2640);
    expect(horasSemanais(escalaPreset("seg-sex-40"))).toBe(2400);
    expect(horasSemanais(escalaPreset("12x36"))).toBe(2310); // 11h a cada 2 dias
  });

  it("acha o dia da escala cíclica, inclusive antes do início", () => {
    const e = escalaPreset("12x36", "2026-11-01");
    expect(escalaDoDia(e, "2026-11-01").trabalha).toBe(true);
    expect(escalaDoDia(e, "2026-11-02").trabalha).toBe(false);
    expect(escalaDoDia(e, "2026-10-31").trabalha).toBe(false);
    expect(escalaDoDia(e, "2026-10-30").trabalha).toBe(true);
  });

  it("sugere horários comuns e marcações previstas", () => {
    expect(horariosComuns(escalaPreset("seg-sex-44"))).toEqual(["07:00", "12:00", "13:00", "16:00", "17:00"]);
    expect(marcacoesPrevistas(FOLGA)).toEqual({});
    expect(marcacoesPrevistas(diaDeTrabalho("07:00", "11:00", 0))).toEqual({ entrada: "07:00", saida: "11:00" });
    expect(marcacoesPrevistas({ trabalha: true, almocoMin: 60, horasLiquidasMin: 480 })).toEqual({
      entrada: "08:00",
      almoco: "13:00",
      volta: "14:00",
      saida: "17:00",
    });
    expect(horariosComuns(escalaPreset("12x36"))).toContain("19:00");
  });
});

describe("feriados", () => {
  it("calcula a Páscoa e os feriados móveis", () => {
    expect(pascoa(2026)).toBe("2026-04-05");
    expect(pascoa(2027)).toBe("2027-03-28");
    const f2026 = feriadosNacionais(2026);
    expect(f2026.find((f) => f.nome === "Sexta-feira Santa")!.data).toBe("2026-04-03");
    expect(f2026.some((f) => f.data === "2026-11-20")).toBe(true);
    expect(feriadosNacionais(2023).some((f) => f.data === "2023-11-20")).toBe(false);
    expect(pontosFacultativos(2026).map((f) => f.data)).toEqual(["2026-02-16", "2026-02-17", "2026-06-04"]);
  });

  it("junta nacionais de dois anos com os locais, sem duplicar", () => {
    const mapa = feriadosDoIntervalo("2026-12-21", "2027-01-20", [
      { data: "2027-01-20", nome: "São Sebastião", tipo: "local" },
      { data: "2026-12-25", nome: "Duplicado", tipo: "local" },
      { data: "2027-03-01", nome: "Fora", tipo: "local" },
    ]);
    expect([...mapa.keys()].sort()).toEqual(["2026-12-25", "2027-01-01", "2027-01-20"]);
    expect(mapa.get("2026-12-25")!.nome).toBe("Natal");
  });
});
