import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AtualizacaoAssinatura } from "./provedor";

/** Supabase com a chave de serviço (só no servidor). null se não configurado. */
export function supabaseServidor(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Conta (account) de quem é dono, a partir do token de acesso enviado pelo app. */
export async function contaDoToken(sb: SupabaseClient, token: string) {
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: m } = await sb.from("members").select("account_id").eq("user_id", data.user.id).eq("papel", "dono").limit(1).maybeSingle();
  return m ? { conta: m.account_id as string, usuario: data.user } : null;
}

/** Grava a mudança vinda do webhook. Cancelamento mantém o último dia pago. */
export async function gravarAssinatura(sb: SupabaseClient, a: AtualizacaoAssinatura) {
  const linha: Record<string, unknown> = {
    account_id: a.conta,
    plano: a.assinatura.plano,
    status: a.assinatura.status,
    trabalhadores: a.assinatura.trabalhadores ?? 1,
    provedor: "asaas",
    provedor_assinatura: a.provedorAssinatura,
    atualizado_em: new Date().toISOString(),
  };
  if (a.provedorCliente) linha.provedor_cliente = a.provedorCliente;
  if (a.assinatura.pagoAte) {
    linha.pago_ate = a.assinatura.pagoAte;
    // nunca diminui o que já foi pago (avisos podem chegar fora de ordem)
    const { data: atual } = await sb.from("subscriptions").select("pago_ate").eq("account_id", a.conta).maybeSingle();
    if (atual?.pago_ate && atual.pago_ate > a.assinatura.pagoAte && a.assinatura.status === "ativa") linha.pago_ate = atual.pago_ate;
    const { error } = await sb.from("subscriptions").upsert(linha, { onConflict: "account_id" });
    if (error) throw error;
  } else {
    const { error } = await sb.from("subscriptions").update(linha).eq("account_id", a.conta);
    if (error) throw error;
  }
}
