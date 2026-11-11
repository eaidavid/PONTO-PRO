import "fake-indexeddb/auto";
import type { Assinatura } from "@ponto-pro/core";
import { beforeEach, describe, expect, it } from "vitest";
import { apagarRegistro, salvarPessoal, salvarRegistro } from "../lib/acoes";
import { db } from "../lib/db";
import { lerDestino } from "../lib/nuvem/destino";
import { esquecerSincronizacao, sincronizar } from "../lib/nuvem/sincronizar";
import type { Linha, Remoto, TabelaSync } from "../lib/nuvem/tipos";

/** Servidor falso: guarda as linhas e aplica o "último a editar vence", como o gatilho do Postgres. */
class RemotoMemoria implements Remoto {
  linhas = new Map<string, Linha & { tabela: TabelaSync }>();
  plano: Assinatura | null = null;
  async enviar(tabela: TabelaSync, linhas: Linha[]) {
    for (const l of linhas) {
      const k = `${tabela}:${l.chave}`;
      const antes = this.linhas.get(k);
      if (antes && antes.atualizadoEm > l.atualizadoEm) continue;
      this.linhas.set(k, { ...structuredClone(l), tabela });
    }
  }
  async buscar(tabela: TabelaSync, desde: string | null) {
    return [...this.linhas.values()]
      .filter((l) => l.tabela === tabela && (!desde || l.atualizadoEm > desde))
      .sort((a, b) => a.atualizadoEm.localeCompare(b.atualizadoEm))
      .map(({ tabela: _t, ...l }) => structuredClone(l));
  }
  async assinatura() {
    return this.plano;
  }
}

const dia = (data: string, entrada = "08:00") => ({ data, tipo: "normal" as const, marcacoes: { entrada } });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("sincronizar", () => {
  it("na primeira vez envia tudo o que já estava no celular e esvazia a fila", async () => {
    await db.registros.put({ ...dia("2026-11-02"), atualizadoEm: "2026-11-02T11:00:00.000Z" });
    await salvarPessoal({ nome: "Ana" });
    const r = new RemotoMemoria();
    await sincronizar(r, "u1");
    expect(r.linhas.get("registros:2026-11-02")?.dados).toMatchObject({ marcacoes: { entrada: "08:00" } });
    expect(r.linhas.get("config:pessoal")?.dados).toEqual({ nome: "Ana" });
    expect(await db.fila.count()).toBe(0);
  });

  it("não envia a assinatura nem o estado da sincronização", async () => {
    await db.config.put({ chave: "assinatura", valor: { plano: "individual" }, atualizadoEm: "2026-11-01T00:00:00.000Z" });
    const r = new RemotoMemoria();
    await sincronizar(r, "u1");
    expect([...r.linhas.keys()].some((k) => k.includes("assinatura") || k.includes("sincronizacao"))).toBe(false);
  });

  it("apagar no celular apaga na nuvem", async () => {
    const r = new RemotoMemoria();
    await salvarRegistro(dia("2026-11-03"));
    await sincronizar(r, "u1");
    await apagarRegistro("2026-11-03");
    await sincronizar(r, "u1");
    expect(r.linhas.get("registros:2026-11-03")?.apagado).toBe(true);
  });

  it("traz o que foi feito em outro aparelho e o mais novo vence", async () => {
    const r = new RemotoMemoria();
    await salvarRegistro(dia("2026-11-04", "08:00"));
    await sincronizar(r, "u1");
    // outro celular corrigiu depois
    const futuro = new Date(Date.now() + 60_000).toISOString();
    await r.enviar("registros", [{ chave: "2026-11-04", dados: { ...dia("2026-11-04", "07:30"), atualizadoEm: futuro }, atualizadoEm: futuro, apagado: false }]);
    await r.enviar("registros", [{ chave: "2026-11-05", dados: { ...dia("2026-11-05"), atualizadoEm: futuro }, atualizadoEm: futuro, apagado: false }]);
    await sincronizar(r, "u1");
    expect((await db.registros.get("2026-11-04"))?.marcacoes.entrada).toBe("07:30");
    expect(await db.registros.get("2026-11-05")).toBeTruthy();
    expect(await db.fila.count()).toBe(0);
  });

  it("uma versão mais velha da nuvem não passa por cima da edição local", async () => {
    const r = new RemotoMemoria();
    await r.enviar("registros", [{ chave: "2026-11-06", dados: { ...dia("2026-11-06", "06:00"), atualizadoEm: "2020-01-01T00:00:00.000Z" }, atualizadoEm: "2020-01-01T00:00:00.000Z", apagado: false }]);
    await salvarRegistro(dia("2026-11-06", "09:00"));
    await sincronizar(r, "u1");
    expect((await db.registros.get("2026-11-06"))?.marcacoes.entrada).toBe("09:00");
    expect((r.linhas.get("registros:2026-11-06")?.dados as { marcacoes: { entrada: string } }).marcacoes.entrada).toBe("09:00");
  });

  it("apagado em outro aparelho some daqui", async () => {
    const r = new RemotoMemoria();
    await salvarRegistro(dia("2026-11-07"));
    await sincronizar(r, "u1");
    const futuro = new Date(Date.now() + 60_000).toISOString();
    await r.enviar("registros", [{ chave: "2026-11-07", dados: {}, atualizadoEm: futuro, apagado: true }]);
    await sincronizar(r, "u1");
    expect(await db.registros.get("2026-11-07")).toBeUndefined();
  });

  it("traz a situação do plano e a esquece ao sair", async () => {
    const r = new RemotoMemoria();
    r.plano = { plano: "individual", status: "ativa", pagoAte: "2026-12-11" };
    await sincronizar(r, "u1");
    expect((await db.config.get("assinatura"))?.valor).toEqual(r.plano);
    await esquecerSincronizacao();
    expect(await db.config.get("assinatura")).toBeUndefined();
    expect(await db.config.get("sincronizacao")).toBeUndefined();
  });

  it("outra conta no mesmo celular recebe tudo do zero", async () => {
    await salvarRegistro(dia("2026-11-08"));
    await sincronizar(new RemotoMemoria(), "u1");
    const outra = new RemotoMemoria();
    await sincronizar(outra, "u2");
    expect(outra.linhas.has("registros:2026-11-08")).toBe(true);
  });
});

describe("lerDestino", () => {
  it("entende celular e e-mail", () => {
    expect(lerDestino("(11) 98765-4321")).toEqual({ tipo: "telefone", valor: "+5511987654321" });
    expect(lerDestino("+55 11 98765-4321")).toEqual({ tipo: "telefone", valor: "+5511987654321" });
    expect(lerDestino(" Ana@Exemplo.com ")).toEqual({ tipo: "email", valor: "ana@exemplo.com" });
    expect(lerDestino("123")).toBeNull();
  });
});
