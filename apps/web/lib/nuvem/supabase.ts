import type { Assinatura } from "@ponto-pro/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Destino } from "./destino";
import type { Linha, Remoto, TabelaSync } from "./tipos";

/** Carregado só quando a conta está configurada (fica fora do pacote da tela Hoje). */

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave) throw new Error("Conta não configurada");
    cliente = createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "pingou-sessao" } });
  }
  return cliente;
}

const TABELA: Record<Exclude<TabelaSync, "config">, string> = {
  registros: "day_entries",
  itens: "production_items",
  lancamentos: "production_entries",
};

interface LinhaBanco {
  chave?: string;
  dados: unknown;
  atualizado_em: string;
  apagado: boolean;
}

const paraLinha = (r: LinhaBanco, chave = r.chave ?? ""): Linha => ({ chave, dados: r.dados, atualizadoEm: r.atualizado_em, apagado: r.apagado });
const paraBanco = (l: Linha) => ({ chave: l.chave, dados: l.dados, atualizado_em: l.atualizadoEm, apagado: l.apagado });

async function buscarTudo(tabela: string, desde: string | null): Promise<LinhaBanco[]> {
  const todas: LinhaBanco[] = [];
  const PAGINA = 1000;
  for (let de = 0; ; de += PAGINA) {
    let q = supabase().from(tabela).select("chave, dados, atualizado_em, apagado");
    if (desde) q = q.gt("atualizado_em", desde);
    const { data, error } = await q.order("atualizado_em").range(de, de + PAGINA - 1);
    if (error) throw error;
    todas.push(...(data as LinhaBanco[]));
    if (data.length < PAGINA) return todas;
  }
}

/** Remoto no Supabase. O perfil fica em work_profiles; as outras configurações em settings. */
export const remotoSupabase: Remoto = {
  async enviar(tabela, linhas) {
    if (tabela === "config") {
      const perfil = linhas.find((l) => l.chave === "perfil");
      const outras = linhas.filter((l) => l.chave !== "perfil");
      if (perfil) {
        const { error } = await supabase().from("work_profiles").upsert({ dados: perfil.dados, atualizado_em: perfil.atualizadoEm, apagado: perfil.apagado }, { onConflict: "user_id" });
        if (error) throw error;
      }
      if (outras.length) {
        const { error } = await supabase().from("settings").upsert(outras.map(paraBanco), { onConflict: "user_id,chave" });
        if (error) throw error;
      }
      return;
    }
    const { error } = await supabase().from(TABELA[tabela]).upsert(linhas.map(paraBanco), { onConflict: "user_id,chave" });
    if (error) throw error;
  },

  async buscar(tabela, desde) {
    if (tabela !== "config") return (await buscarTudo(TABELA[tabela], desde)).map((r) => paraLinha(r));
    let q = supabase().from("work_profiles").select("dados, atualizado_em, apagado");
    if (desde) q = q.gt("atualizado_em", desde);
    const { data, error } = await q;
    if (error) throw error;
    const perfil = (data as LinhaBanco[]).map((r) => paraLinha(r, "perfil"));
    return [...perfil, ...(await buscarTudo("settings", desde)).map((r) => paraLinha(r))];
  },

  async assinatura() {
    const { data, error } = await supabase().from("subscriptions").select("plano, status, pago_ate, trabalhadores").limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { plano: data.plano, status: data.status, pagoAte: data.pago_ate, trabalhadores: data.trabalhadores } as Assinatura;
  },
};

// ---------- conta ----------

export async function enviarCodigo(destino: Destino) {
  const { error } =
    destino.tipo === "email"
      ? await supabase().auth.signInWithOtp({ email: destino.valor, options: { shouldCreateUser: true } })
      : await supabase().auth.signInWithOtp({ phone: destino.valor, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function confirmarCodigo(destino: Destino, codigo: string) {
  const token = codigo.replace(/\D/g, "");
  const { error } =
    destino.tipo === "email"
      ? await supabase().auth.verifyOtp({ email: destino.valor, token, type: "email" })
      : await supabase().auth.verifyOtp({ phone: destino.valor, token, type: "sms" });
  if (error) throw error;
}

export async function usuarioAtual() {
  const { data } = await supabase().auth.getSession();
  return data.session?.user ?? null;
}

export async function sairDaConta() {
  await supabase().auth.signOut();
}

/** LGPD: apaga tudo da pessoa no servidor. */
export async function apagarDadosNaNuvem() {
  const { error } = await supabase().rpc("apagar_meus_dados");
  if (error) throw error;
  await supabase().auth.signOut();
}
