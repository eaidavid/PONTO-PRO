import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServidor } from "./cobranca/servidor";

/** E-mails com acesso ao painel (variável ADMIN_EMAILS, separados por vírgula). */
export function emailsAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type AcessoAdmin = { sb: SupabaseClient; email: string } | Response;

/**
 * Confere em cada pedido: servidor configurado, token válido e e-mail na lista.
 * Esconder o link do painel não é proteção; esta conferência é.
 */
export async function verificarAdmin(req: Request): Promise<AcessoAdmin> {
  const sb = supabaseServidor();
  if (!sb) return Response.json({ erro: "O painel precisa do banco configurado." }, { status: 503 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ erro: "Entre com a sua conta." }, { status: 401 });
  const { data, error } = await sb.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) return Response.json({ erro: "Entre com a sua conta." }, { status: 401 });
  if (!emailsAdmin().includes(email)) return Response.json({ erro: "Esta conta não tem acesso ao painel." }, { status: 403 });
  return { sb, email };
}

/** Registra uma ação do painel (quem, o quê, em quem). */
export async function registrarAcao(sb: SupabaseClient, admin: string, acao: string, alvo: string | null, detalhes: Record<string, unknown> = {}) {
  await sb.from("admin_audit").insert({ admin_email: admin, acao, alvo, detalhes });
}
