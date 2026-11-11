import type { DiaRegistro, Etapa, Feriado, ItemProducao, LancamentoProducao, Marcacoes, Obra, PerfilTrabalho } from "@ponto-pro/core";
import { FORMATO_BACKUP } from "./marca";
import { type Config, type ConferenciaSalva, type Consentimento, type DadosPessoais, db, type Preferencias } from "./db";

export const agoraIso = () => new Date().toISOString();
const VERSOES_NO_HISTORICO = 20;

/** Grava com histórico e fila de sincronização, numa transação só. */
async function gravar<T extends { atualizadoEm: string }>(
  tabela: "registros" | "itens" | "lancamentos",
  chave: string,
  valor: T | null,
) {
  await db.transaction("rw", [db[tabela], db.fila, db.historico], async () => {
    const t = db.table(tabela);
    const antes = await t.get(chave);
    if (antes) {
      await db.historico.add({ tabela, chave, antes, em: agoraIso() });
      // guarda só as últimas versões de cada item
      const versoes = await db.historico.where("[tabela+chave]").equals([tabela, chave]).primaryKeys();
      if (versoes.length > VERSOES_NO_HISTORICO) await db.historico.bulkDelete(versoes.slice(0, versoes.length - VERSOES_NO_HISTORICO));
    }
    if (valor) await t.put(valor);
    else await t.delete(chave);
    // a fila de sincronização guarda só a última operação de cada item
    await db.fila.where("[tabela+chave]").equals([tabela, chave]).delete();
    await db.fila.add({ tabela, chave, operacao: valor ? "salvar" : "apagar", em: agoraIso() });
  });
}

/** Grava uma configuração e coloca na fila de sincronização (só a última de cada chave). */
async function gravarConfig(chave: Config["chave"], valor: unknown) {
  await db.transaction("rw", [db.config, db.fila], async () => {
    await db.config.put({ chave, valor, atualizadoEm: agoraIso() });
    if (!CONFIG_LOCAL.includes(chave)) {
      await db.fila.where("[tabela+chave]").equals(["config", chave]).delete();
      await db.fila.add({ tabela: "config", chave, operacao: "salvar", em: agoraIso() });
    }
  });
}

/** Configurações que ficam só no aparelho (não sobem para a nuvem). */
const CONFIG_LOCAL: Config["chave"][] = ["assinatura", "sincronizacao"];

// ---------- configuração ----------

export async function salvarPerfil(perfil: PerfilTrabalho) {
  await gravarConfig("perfil", { ...perfil, atualizadoEm: agoraIso() });
}

export async function salvarPessoal(dados: DadosPessoais) {
  await gravarConfig("pessoal", dados);
}

export async function salvarPreferencias(p: Preferencias) {
  await gravarConfig("preferencias", p);
}

/** Marca o começo do teste grátis (só na primeira vez). */
export async function marcarInicioUso(data: string) {
  if (!(await db.config.get("inicioUso"))) await gravarConfig("inicioUso", data);
}

export async function salvarConsentimento(c: Consentimento) {
  await gravarConfig("consentimento", c);
}

export async function salvarObras(obras: Obra[]) {
  await gravarConfig("obras", obras);
}

export async function salvarFeriadosLocais(feriados: Feriado[]) {
  await gravarConfig("feriadosLocais", [...feriados].sort((a, b) => a.data.localeCompare(b.data)));
}

export async function salvarConferencia(c: ConferenciaSalva) {
  const atual = ((await db.config.get("conferencias"))?.valor as ConferenciaSalva[] | undefined) ?? [];
  const lista = [...atual.filter((x) => x.fim !== c.fim), c].sort((a, b) => b.fim.localeCompare(a.fim));
  await gravarConfig("conferencias", lista);
}

/** Grava vários registros de uma vez (ex.: completar com a escala). Devolve os anteriores para desfazer. */
export async function salvarVariosRegistros(regs: DiaRegistro[]): Promise<{ data: string; antes: DiaRegistro | null }[]> {
  const antes = await Promise.all(regs.map(async (r) => ({ data: r.data, antes: (await db.registros.get(r.data)) ?? null })));
  for (const r of regs) await salvarRegistro(r);
  return antes;
}

export async function restaurarVarios(lista: { data: string; antes: DiaRegistro | null }[]) {
  for (const x of lista) await restaurarRegistro(x.data, x.antes);
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
export async function baterPonto(data: string, etapa: Etapa, hora: string, obraId?: string): Promise<DiaRegistro | null> {
  const antes = (await db.registros.get(data)) ?? null;
  const base: DiaRegistro = antes ?? { data, tipo: "normal", marcacoes: {} };
  const novo: DiaRegistro = {
    ...base,
    tipo: base.tipo === "folga" || base.tipo === "compensado" ? base.tipo : "normal",
    marcacoes: { ...base.marcacoes, [etapa]: hora },
  };
  if (obraId && !base.obraId) novo.obraId = obraId;
  await salvarRegistro(novo);
  return antes;
}

/** Aplica marcações de uma vez (correção de ponto esquecido). Devolve o anterior para desfazer. */
export async function completarMarcacoes(data: string, marcacoes: Marcacoes): Promise<DiaRegistro | null> {
  const antes = (await db.registros.get(data)) ?? null;
  const base: DiaRegistro = antes ?? { data, tipo: "normal", marcacoes: {} };
  await salvarRegistro({ ...base, marcacoes: { ...base.marcacoes, ...marcacoes } });
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
  const json = JSON.stringify({ app: FORMATO_BACKUP, exportadoEm: agoraIso(), config, registros, itens, lancamentos }, null, 2);
  return new Blob([json], { type: "application/json" });
}

/** Manutenção ao abrir: pede armazenamento persistente (o celular não apaga o banco para liberar espaço). */
export async function manutencao() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* navegador sem suporte */
  }
}

export async function apagarTudo() {
  await db.delete();
  try {
    localStorage.removeItem("pp-tema");
    localStorage.removeItem("pp-tamanho");
  } catch {
    /* sem armazenamento */
  }
}

export function novoId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
