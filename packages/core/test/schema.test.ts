import { describe, expect, it } from "vitest";
import { DiaRegistro, Feriado } from "../src/schema/registro";
import { ItemProducao, LancamentoProducao } from "../src/schema/producao";

describe("schemas de registro e produção", () => {
  it("registro do dia com padrões e horário validado", () => {
    expect(DiaRegistro.parse({ data: "2026-11-09" })).toEqual({ data: "2026-11-09", tipo: "normal", marcacoes: {} });
    expect(DiaRegistro.safeParse({ data: "2026-11-09", marcacoes: { entrada: "7:00" } }).error!.issues[0]!.message).toBe("Use o formato 07:00");
    expect(DiaRegistro.safeParse({ data: "2026-13-01" }).success).toBe(false);
    expect(Feriado.safeParse({ data: "2026-01-20", nome: "São Sebastião", tipo: "local" }).success).toBe(true);
  });

  it("serviço e lançamento: unidade livre, sem quantidade zero ou negativa", () => {
    const item = ItemProducao.parse({ id: "x", nome: "Rejunte", area: "Pisos", unidade: "balde", preco: 1500 });
    expect(item.exemplo).toBe(false);
    expect(ItemProducao.safeParse({ ...item, unidade: "" }).success).toBe(false);
    const base = { id: "l", data: "2026-11-05", itemId: "x", quantidade: 50, precoUnitario: 1200 };
    expect(LancamentoProducao.safeParse(base).success).toBe(true);
    expect(LancamentoProducao.safeParse({ ...base, quantidade: 0 }).error!.issues[0]!.message).toBe("A quantidade precisa ser maior que zero");
    expect(LancamentoProducao.safeParse({ ...base, precoUnitario: -1 }).success).toBe(false);
  });
});
