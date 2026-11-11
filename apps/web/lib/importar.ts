import {
  type DiaRegistro,
  DiaRegistro as EsquemaRegistro,
  type ItemProducao,
  ItemProducao as EsquemaItem,
  type LancamentoProducao,
  LancamentoProducao as EsquemaLancamento,
  PerfilTrabalho,
} from "@ponto-pro/core";
import { agoraIso } from "./acoes";
import { FORMATO_BACKUP, MARCA } from "./marca";
import { db } from "./db";

/*
 * Restauração de backup. Fica num módulo separado (carregado só quando usado)
 * porque a validação usa o Zod, que pesa ~30 KB e não precisa estar na tela Hoje.
 */

export interface ResultadoImportacao {
  registros: number;
  lancamentos: number;
  ignorados: number;
}

/** Restaura um backup gerado por "Baixar meus dados". Valida tudo antes de gravar. */
export async function importarDados(texto: string): Promise<ResultadoImportacao> {
  let dados: { app?: string; config?: { chave: string; valor: unknown }[]; registros?: unknown[]; itens?: unknown[]; lancamentos?: unknown[] };
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error(`O arquivo não é um backup do ${MARCA.nome}.`);
  }
  if (dados.app !== FORMATO_BACKUP) throw new Error(`O arquivo não é um backup do ${MARCA.nome}.`);
  const cfgPerfil = dados.config?.find((c) => c.chave === "perfil");
  const perfil = PerfilTrabalho.safeParse(cfgPerfil?.valor);
  if (!perfil.success) throw new Error("O backup não tem um perfil de trabalho válido.");
  let ignorados = 0;
  const validar = <T,>(lista: unknown[] | undefined, esquema: { safeParse: (v: unknown) => { success: boolean; data?: T } }) =>
    (lista ?? []).flatMap((v) => {
      const r = esquema.safeParse(v);
      if (!r.success) {
        ignorados++;
        return [];
      }
      return [{ ...(r.data as object), atualizadoEm: (v as { atualizadoEm?: string }).atualizadoEm ?? agoraIso() } as T & { atualizadoEm: string }];
    });
  const registros = validar<DiaRegistro>(dados.registros, EsquemaRegistro);
  const itens = validar<ItemProducao>(dados.itens, EsquemaItem);
  const lancamentos = validar<LancamentoProducao>(dados.lancamentos, EsquemaLancamento);
  await db.transaction("rw", [db.config, db.registros, db.itens, db.lancamentos], async () => {
    await Promise.all([db.registros.clear(), db.itens.clear(), db.lancamentos.clear()]);
    for (const c of dados.config ?? []) {
      if (c.chave === "perfil") await db.config.put({ chave: "perfil", valor: perfil.data, atualizadoEm: agoraIso() });
      else if (["pessoal", "preferencias", "obras", "feriadosLocais", "conferencias"].includes(c.chave))
        await db.config.put({ chave: c.chave as "pessoal", valor: c.valor, atualizadoEm: agoraIso() });
    }
    await db.registros.bulkPut(registros);
    await db.itens.bulkPut(itens);
    await db.lancamentos.bulkPut(lancamentos);
    // com conta: a próxima sincronização envia tudo de novo e junta com o que já está na nuvem
    await db.config.delete("sincronizacao");
  });
  return { registros: registros.length, lancamentos: lancamentos.length, ignorados };
}

