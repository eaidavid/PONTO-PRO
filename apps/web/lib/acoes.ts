import type { DiaRegistro, Etapa, ItemProducao, LancamentoProducao, PerfilTrabalho } from "@ponto-pro/core";
import { type DadosPessoais, db, type Preferencias } from "./db";

const agoraIso = () => new Date().toISOString();

/** Grava com histórico e fila de sincronização, numa transação só. */
async function gravar<T extends { atualizadoEm: string }>(
  tabela: "registros" | "itens" | "lancamentos",
  chave: string,
  valor: T | null,
) {
  await db.transaction("rw", [db[tabela], db.fila, db.historico], async () => {
    const t = db.table(tabela);
    const antes = await t.get(chave);
    if (antes) await db.historico.add({ tabela, chave, antes, em: agoraIso() });
    if (valor) await t.put(valor);
    else await t.delete(chave);
    await db.fila.add({ tabela, chave, operacao: valor ? "salvar" : "apagar", em: agoraIso() });
  });
}

// ---------- configuração ----------

export async function salvarPerfil(perfil: PerfilTrabalho) {
  await db.config.put({ chave: "perfil", valor: { ...perfil, atualizadoEm: agoraIso() }, atualizadoEm: agoraIso() });
  await db.fila.add({ tabela: "config", chave: "perfil", operacao: "salvar", em: agoraIso() });
}

export async function salvarPessoal(dados: DadosPessoais) {
  await db.config.put({ chave: "pessoal", valor: dados, atualizadoEm: agoraIso() });
}

export async function salvarPreferencias(p: Preferencias) {
  await db.config.put({ chave: "preferencias", valor: p, atualizadoEm: agoraIso() });
}

// ---------- registros ----------

export async function salvarRegistro(r: DiaRegistro) {
  const vazio = r.tipo === "normal" && !Object.values(r.marcacoes).some(Boolean) && !r.observacao;
  await gravar("registros", r.data, vazio ? null : { ...r, atualizadoEm: agoraIso() });
}

export async function apagarRegistro(data: string) {
  await gravar("registros", data, null);
}

/** Bate o ponto e devolve o registro anterior (para "Desfazer"). */
export async function baterPonto(data: string, etapa: Etapa, hora: string): Promise<DiaRegistro | null> {
  const antes = (await db.registros.get(data)) ?? null;
  const base: DiaRegistro = antes ?? { data, tipo: "normal", marcacoes: {} };
  await salvarRegistro({ ...base, tipo: base.tipo === "folga" || base.tipo === "compensado" ? base.tipo : "normal", marcacoes: { ...base.marcacoes, [etapa]: hora } });
  return antes;
}

/** Volta um dia ao estado anterior (ou apaga, se não existia). */
export async function restaurarRegistro(data: string, antes: DiaRegistro | null) {
  if (antes) await salvarRegistro(antes);
  else await apagarRegistro(data);
}

// ---------- produção ----------

export async function salvarItem(item: ItemProducao) {
  await gravar("itens", item.id, { ...item, atualizadoEm: agoraIso() });
}

export async function removerItem(item: ItemProducao) {
  await gravar("itens", item.id, { ...item, removido: true, atualizadoEm: agoraIso() });
}

export async function lancarProducao(l: LancamentoProducao) {
  await gravar("lancamentos", l.id, { ...l, atualizadoEm: agoraIso() });
}

export async function apagarLancamento(id: string): Promise<LancamentoProducao | null> {
  const antes = (await db.lancamentos.get(id)) ?? null;
  await gravar("lancamentos", id, null);
  return antes;
}

// ---------- privacidade (LGPD) ----------

export async function exportarDados(): Promise<Blob> {
  const [config, registros, itens, lancamentos] = await Promise.all([
    db.config.toArray(),
    db.registros.toArray(),
    db.itens.toArray(),
    db.lancamentos.toArray(),
  ]);
  const json = JSON.stringify({ app: "Ponto Pro", exportadoEm: agoraIso(), config, registros, itens, lancamentos }, null, 2);
  return new Blob([json], { type: "application/json" });
}

export async function apagarTudo() {
  await db.delete();
  try {
    localStorage.removeItem("pp-tema");
  } catch {
    /* sem armazenamento */
  }
}

export function novoId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
