import { describe, expect, it } from "vitest";
import { gerarContracheque, GLOSSARIO, RODAPE_CONTRACHEQUE } from "../src/contracheque";
import { calcularPeriodo } from "../src/calculo/periodo";
import { simularMeta } from "../src/metas";
import {
  confirmarCampo,
  diasTrabalhados,
  ehSugestao,
  itensDosPacotes,
  MODELOS,
  PACOTES_CONSTRUCAO,
  resumoDoPerfil,
  TODOS_PACOTES,
} from "../src/modelos";
import { calcularPrevisao } from "../src/previsao";
import { buscarItens, normalizar, previaProducao, rotuloUnidade, totaisPorArea } from "../src/producao";
import { PerfilTrabalho } from "../src/schema/perfil";
import { dia, perfilJose, SEMANA, semanaJose } from "./ajuda";

const PERIODO = { inicio: "2026-10-21", fim: "2026-11-20" };

describe("previsão até o fechamento", () => {
  const perfil = perfilJose({ descontos: [{ id: "d", nome: "INSS", tipo: "percentual", valor: 9 }] });

  it("soma o feito com o resto da escala", () => {
    const r = calcularPrevisao({
      perfil,
      periodo: PERIODO,
      hoje: "2026-11-09",
      registros: [...semanaJose(), dia("2026-11-09", "07:02"), dia("2026-11-12", undefined, undefined, undefined, undefined, "folga")],
      agora: { data: "2026-11-09", minutos: 9 * 60 + 41, hora: "09:41" },
    });
    // Restam: 09 (hoje, parcial), 10, 11, 13, 16, 17, 18 e 19/11.
    // 12/11 é folga, 15/11 é domingo e 20/11 é feriado (Consciência Negra).
    expect(r.falta.dias).toBe(8);
    expect(r.falta.horasMin).toBe(540 - 159 + 540 * 2 + 480 + 540 * 4);
    expect(r.previsto.liquido).toBeGreaterThan(r.realizado.liquido);
    expect(r.falta.valor).toBe(r.previsto.liquido - r.realizado.liquido);
    expect(r.progresso).toBeGreaterThan(0);
    expect(r.progresso).toBeLessThan(1);
    expect(r.extrato.at(-1)!.texto).toMatch(/^Já ganhou R\$ .* Falta R\$ /);
    // Finados (02/11) e Consciência Negra (20/11) entram como abono, não como dia projetado
    expect(r.previsto.ganhos.find((l) => l.codigo === "010")!.referencia).toBe("17h00");
  });

  it("dia de hoje já cumprido não é projetado de novo; período terminado não tem falta", () => {
    const r = calcularPrevisao({
      perfil,
      periodo: SEMANA,
      hoje: "2026-10-30",
      registros: [...semanaJose().slice(0, 4), dia("2026-10-30", "07:00", "12:00", "13:00")],
      agora: { data: "2026-10-30", minutos: 17 * 60, hora: "17:00" },
    });
    expect(r.falta.dias).toBe(0);
    const fim = calcularPrevisao({ perfil, periodo: SEMANA, hoje: "2026-11-05", registros: semanaJose() });
    expect(fim.falta.valor).toBe(0);
    expect(fim.progresso).toBe(1);
    const vazio = calcularPrevisao({ perfil: perfilJose({ pagamento: { forma: "producao" } }), periodo: SEMANA, hoje: "2026-10-25" });
    expect(vazio.progresso).toBe(0);
  });
});

describe("simulador de meta", () => {
  const perfil = perfilJose({ descontos: [{ id: "d", nome: "INSS", tipo: "percentual", valor: 9 }] });
  const meioFio = { id: "mf", nome: "Assentar meio-fio", area: "Externos", unidade: "m", preco: 1200, exemplo: false };

  it("mostra sábados, horas extras, folgas e produção", () => {
    const r = simularMeta({ perfil, alvo: 542_000, previsto: 500_000, item: meioFio });
    expect(r.faltaLiquido).toBe(42_000);
    expect(r.faltaBruto).toBe(46_154);
    expect(r.opcoes.map((o) => o.tipo)).toEqual(["horas-extras", "sabados", "folgas", "producao"]);
    expect(r.opcoes.find((o) => o.tipo === "sabados")!.quantidade).toBe(3);
    expect(r.opcoes.find((o) => o.tipo === "producao")!.quantidade).toBe(39);
    expect(r.frase).toBe("Faltam R$ 420. Dá com 3 sábados de 5h ou 39 m de assentar meio-fio.");
  });

  it("meta já alcançada", () => {
    expect(simularMeta({ perfil, alvo: 100_000, previsto: 500_000 }).frase).toBe("Pela previsão, você já chega lá: R$ 5.000.");
  });

  it("singular, saldo de horas ligado e descontos de 100%", () => {
    const um = simularMeta({ perfil: perfilJose(), alvo: 3_750, previsto: 0 });
    expect(um.opcoes[0]!.texto).toBe("1 hora extra");
    expect(simularMeta({ perfil: perfilJose(), alvo: 1, previsto: 0, horasSabadoMin: 600 }).opcoes[1]!.texto).toBe("1 sábado de 10h");
    const banco = simularMeta({ perfil: perfilJose({ bancoHoras: { ativo: true, pagaDomingoFeriado: true } }), alvo: 10_000, previsto: 0 });
    expect(banco.opcoes.map((o) => o.tipo)).toEqual(["folgas"]);
    expect(banco.observacao).toContain("saldo de horas");
    const nada = simularMeta({ perfil: perfilJose({ bancoHoras: { ativo: true, pagaDomingoFeriado: false } }), alvo: 10_000, previsto: 0 });
    expect(nada.frase).toBe("Faltam R$ 100.");
    const cem = simularMeta({ perfil: perfilJose({ descontos: [{ id: "x", nome: "Tudo", tipo: "percentual", valor: 100 }] }), alvo: 10_000, previsto: 0 });
    expect(cem.opcoes).toHaveLength(0);
  });
});

describe("contracheque estimado", () => {
  it("tem itens com código, referência, proventos, descontos e rodapé", () => {
    const perfil = perfilJose({ descontos: [{ id: "d", nome: "INSS aproximado", tipo: "percentual", valor: 9 }] });
    const r = calcularPeriodo({ perfil, periodo: SEMANA, registros: [...semanaJose(), dia("2026-10-31", "07:00", undefined, undefined, "12:00")] });
    const c = gerarContracheque(r, { nome: " José ", cargo: "Pedreiro", empresa: "Obra Jardim", documento: "123", logoUrl: "x.png" });
    expect(c.funcionario).toBe("José");
    expect(c.referencia).toBe("25/10 a 31/10");
    expect(c.itens.map((i) => i.codigo)).toEqual(["002", "021", "110"]);
    expect(c.itens[2]!.desconto).toBe(11_588);
    expect(c.itens[2]!.provento).toBeNull();
    expect(c.liquido).toBe(c.totalProventos - c.totalDescontos);
    expect(c.rodape).toBe(RODAPE_CONTRACHEQUE);
    expect(c.documento).toBe("123");
    expect(GLOSSARIO.Proventos).toContain("Ganhos");
    const vazio = gerarContracheque(r);
    expect(vazio.empresa).toBe("Controle pessoal");
    expect(vazio.funcionario).toBe("Trabalhador");
    expect(vazio.logoUrl).toBeUndefined();
  });
});

describe("produção", () => {
  const itens = itensDosPacotes(PACOTES_CONSTRUCAO.map((p) => p.id));

  it("busca sem ligar para acentos e oferece criar", () => {
    expect(normalizar("  Assentar   MEIO-fio ")).toBe("assentar meio-fio");
    const r = buscarItens(itens, "meio fio");
    expect(r.itens[0]!.nome).toBe("Assentar meio-fio");
    expect(r.criar).toBe("meio fio");
    const novo = buscarItens(itens, "Rejunte de pastilha");
    expect(novo.itens).toHaveLength(0);
    expect(novo.criar).toBe("Rejunte de pastilha");
    const ok = buscarItens(itens, "meio-fio");
    expect(ok.itens[0]!.nome).toBe("Assentar meio-fio");
    expect(buscarItens(itens, "hidraulica").itens.length).toBeGreaterThan(0); // pela área, sem acento
    expect(buscarItens(itens, "Assentar meio-fio").criar).toBeNull();
    const ordem = buscarItens(itens, "pintura");
    expect(ordem.itens[0]!.nome.startsWith("Pintura")).toBe(true);
    expect(buscarItens(itens, "").itens).toHaveLength(20);
    expect(buscarItens(itens, "", 5).criar).toBeNull();
    expect(buscarItens(itens, "piso").itens.map((i) => i.nome)).toContain("Assentar piso cerâmico");
  });

  it("prévia, unidades e totais por área", () => {
    expect(previaProducao(50, "m", 1200)).toEqual({ texto: "50 m × R$ 12,00 = R$ 600,00", valor: 60_000 });
    expect(previaProducao(12.5, "m2", 4000).texto).toBe("12,5 m² × R$ 40,00 = R$ 500,00");
    expect(rotuloUnidade("peca")).toBe("peça");
    expect(rotuloUnidade("balde")).toBe("balde");
    const t = totaisPorArea(itens, [
      { itemId: "construcao.externos.1", quantidade: 50, precoUnitario: 1200 },
      { itemId: "construcao.pintura.2", quantidade: 10, precoUnitario: 1500 },
      { itemId: "construcao.pintura.2", quantidade: 10, precoUnitario: 1500 },
      { itemId: "nao-existe", quantidade: 1, precoUnitario: 100 },
    ]);
    expect(t[0]).toEqual({ area: "Externos e acabamento", valor: 60_000, lancamentos: 1 });
    expect(t[1]!.lancamentos).toBe(2);
    expect(t[2]!.area).toBe("Outros");
  });
});

describe("modelos por área", () => {
  it("todos os modelos geram perfis válidos", () => {
    for (const m of Object.values(MODELOS)) {
      const p = m.perfil("2026-11-09T10:00:00-03:00");
      const r = PerfilTrabalho.safeParse(p);
      expect(r.success, `${m.id}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
      expect(p.modelo!.id).toBe(m.id);
    }
  });

  it("construção: 44h, sábado como extra e todos os pacotes", () => {
    const p = MODELOS.construcao.perfil("2026-11-09T10:00:00-03:00");
    expect(resumoDoPerfil(p)).toBe("Sua semana: 44h. Sábado conta como hora extra a 50%.");
    expect(p.producao.pacotes).toHaveLength(12);
    expect(diasTrabalhados(p)).toEqual([1, 2, 3, 4, 5]);
    expect(TODOS_PACOTES.flatMap((x) => x.itens).every((i) => i.exemplo)).toBe(true);
  });

  it("comércio liga o saldo; saúde é plantão", () => {
    expect(resumoDoPerfil(MODELOS.comercio.perfil("2026-11-09"))).toBe("Sua semana: 44h. Horas a mais vão para o saldo de horas.");
    expect(resumoDoPerfil(MODELOS.saude.perfil("2026-11-09"))).toBe("Sua semana: 38h30. Escala em plantões.");
    expect(diasTrabalhados(MODELOS.saude.perfil("2026-11-09"))).toEqual([]);
  });

  it("selo de sugestão sai quando a pessoa confirma o campo", () => {
    const p = MODELOS.construcao.perfil("2026-11-09");
    expect(ehSugestao(p, "adicionais.extraSabado")).toBe(true);
    expect(ehSugestao(p, "adicionais.noturno.percentual")).toBe(true);
    const q = confirmarCampo(p, "adicionais.extraSabado");
    expect(ehSugestao(q, "adicionais.extraSabado")).toBe(false);
    expect(ehSugestao(confirmarCampo(p, "adicionais"), "adicionais.extraDomingo")).toBe(false);
  });

  it("perfil inválido: misto sem valor e folga com horas", () => {
    const misto = perfilJose({ pagamento: { forma: "misto", base: "hora" } });
    expect(PerfilTrabalho.safeParse(misto).error!.issues[0]!.message).toBe("Informe o valor da base escolhida");
    const p = perfilJose();
    if (p.escala.tipo === "semanal") p.escala.dias[0] = { trabalha: false, almocoMin: 0, horasLiquidasMin: 60 };
    expect(PerfilTrabalho.safeParse(p).success).toBe(false);
  });
});

describe("já ganhou não conta feriado que ainda não chegou", () => {
  it("feriado depois de hoje fica de fora do realizado e entra no previsto", () => {
    const perfil = perfilJose();
    // 20/11/2026 (sexta) é Dia da Consciência Negra; hoje é 12/11
    const r = calcularPrevisao({ perfil, periodo: PERIODO, hoje: "2026-11-12", registros: [] });
    const abonoReal = r.realizado.dias.filter((d) => d.data > "2026-11-12").reduce((t, d) => t + d.abonoMin, 0);
    expect(abonoReal).toBe(0);
    expect(r.realizado.dias.find((d) => d.data === "2026-11-02")!.abonoMin).toBeGreaterThan(0); // Finados já passou
    expect(r.previsto.dias.find((d) => d.data === "2026-11-20")!.abonoMin).toBeGreaterThan(0);
  });
});
