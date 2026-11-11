import { db } from "../db";
import type { EstadoSincronizacao, Linha, Remoto, TabelaSync } from "./tipos";
import { TABELAS_SYNC } from "./tipos";

/** Configurações que não sobem (a assinatura vem do servidor; o estado da sincronização é do aparelho). */
const CONFIG_LOCAL = new Set(["assinatura", "sincronizacao"]);
/** Margem ao buscar: relógios de aparelhos diferentes nunca batem exato. */
const MARGEM_MS = 10 * 60_000;

function chaveDe(tabela: TabelaSync, valor: Record<string, unknown>): string {
  if (tabela === "config") return valor.chave as string;
  if (tabela === "registros") return valor.data as string;
  return valor.id as string;
}

async function lerEstado(usuario: string): Promise<EstadoSincronizacao | null> {
  const e = (await db.config.get("sincronizacao"))?.valor as EstadoSincronizacao | undefined;
  return e && e.usuario === usuario ? e : null;
}

async function gravarEstado(e: EstadoSincronizacao) {
  await db.config.put({ chave: "sincronizacao", valor: e, atualizadoEm: new Date().toISOString() });
}

/** Na primeira vez de uma conta neste aparelho, tudo o que já está no celular entra na fila. */
async function enfileirarTudo() {
  const em = new Date().toISOString();
  await db.transaction("rw", [db.config, db.registros, db.itens, db.lancamentos, db.fila], async () => {
    for (const tabela of TABELAS_SYNC) {
      const linhas = (await db.table(tabela).toArray()) as Record<string, unknown>[];
      for (const v of linhas) {
        const chave = chaveDe(tabela, v);
        if (tabela === "config" && CONFIG_LOCAL.has(chave)) continue;
        await db.fila.where("[tabela+chave]").equals([tabela, chave]).delete();
        await db.fila.add({ tabela, chave, operacao: "salvar", em });
      }
    }
  });
}

/** Envia a fila (já compactada: uma operação por item). */
async function enviar(remoto: Remoto) {
  const fila = await db.fila.toArray();
  for (const tabela of TABELAS_SYNC) {
    const pendencias = fila.filter((p) => p.tabela === tabela && !(tabela === "config" && CONFIG_LOCAL.has(p.chave)));
    if (!pendencias.length) continue;
    const linhas: Linha[] = [];
    for (const p of pendencias) {
      const atual = (await db.table(tabela).get(p.chave)) as Record<string, unknown> | undefined;
      if (atual && p.operacao === "salvar") {
        const dados = tabela === "config" ? atual.valor : atual;
        linhas.push({ chave: p.chave, dados, atualizadoEm: (atual.atualizadoEm as string) ?? p.em, apagado: false });
      } else {
        linhas.push({ chave: p.chave, dados: {}, atualizadoEm: p.em, apagado: true });
      }
    }
    for (let i = 0; i < linhas.length; i += 500) await remoto.enviar(tabela, linhas.slice(i, i + 500));
    // só sai da fila o que foi enviado; o que entrou durante o envio fica para a próxima
    await db.fila.bulkDelete(pendencias.map((p) => p.id!));
  }
}

/** Traz o que mudou em outros aparelhos. O último a editar vence; o que ainda está na fila é mais novo aqui. */
async function receber(remoto: Remoto, estado: EstadoSincronizacao) {
  for (const tabela of TABELAS_SYNC) {
    const cursor = estado.cursores[tabela];
    const desde = cursor ? new Date(Date.parse(cursor) - MARGEM_MS).toISOString() : null;
    const linhas = await remoto.buscar(tabela, desde);
    if (!linhas.length) continue;
    await db.transaction("rw", [db.table(tabela), db.fila], async () => {
      const t = db.table(tabela);
      for (const l of linhas) {
        if (tabela === "config" && CONFIG_LOCAL.has(l.chave)) continue;
        if (await db.fila.where("[tabela+chave]").equals([tabela, l.chave]).count()) continue;
        const local = (await t.get(l.chave)) as { atualizadoEm?: string } | undefined;
        if (local?.atualizadoEm && local.atualizadoEm >= l.atualizadoEm) continue;
        if (l.apagado) {
          if (local) await t.delete(l.chave);
        } else if (tabela === "config") {
          await t.put({ chave: l.chave, valor: l.dados, atualizadoEm: l.atualizadoEm });
        } else {
          await t.put(l.dados);
        }
      }
    });
    const maior = linhas.reduce((m, l) => (l.atualizadoEm > m ? l.atualizadoEm : m), cursor ?? "");
    estado.cursores[tabela] = maior;
  }
}

/**
 * Sincroniza o aparelho com a conta: envia a fila, traz as mudanças e a situação do plano.
 * Nunca apaga nada do celular sem que a nuvem tenha uma versão mais nova.
 */
export async function sincronizar(remoto: Remoto, usuario: string): Promise<void> {
  let estado = await lerEstado(usuario);
  if (!estado) {
    await enfileirarTudo();
    estado = { usuario, cursores: {} };
  }
  await enviar(remoto);
  await receber(remoto, estado);
  const assinatura = await remoto.assinatura();
  if (assinatura) await db.config.put({ chave: "assinatura", valor: assinatura, atualizadoEm: new Date().toISOString() });
  else await db.config.delete("assinatura");
  await gravarEstado({ ...estado, ultimaEm: new Date().toISOString() });
}

/** Ao sair da conta: os dados ficam no celular, mas a próxima conta começa do zero. */
export async function esquecerSincronizacao() {
  await db.config.delete("sincronizacao");
  await db.config.delete("assinatura");
}
