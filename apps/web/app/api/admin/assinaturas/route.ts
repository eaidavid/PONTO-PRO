import { verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

/** Assinaturas com o e-mail do dono. */
export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const { data: subs, error } = await a.sb.from("subscriptions").select("account_id, plano, ciclo, status, pago_ate, trabalhadores, provedor, provedor_assinatura, criado_em").order("pago_ate", { ascending: false }).limit(1000);
  if (error) return Response.json({ erro: "Não deu para ler as assinaturas." }, { status: 500 });
  const contas = (subs ?? []).map((s) => s.account_id as string);
  const { data: membros } = contas.length ? await a.sb.from("members").select("account_id, user_id").in("account_id", contas.slice(0, 500)).eq("papel", "dono") : { data: [] };
  const emails = new Map<string, string>();
  for (const m of membros ?? []) {
    const { data } = await a.sb.auth.admin.getUserById(m.user_id as string);
    if (data.user?.email) emails.set(m.account_id as string, data.user.email);
  }
  return Response.json({ assinaturas: (subs ?? []).map((s) => ({ ...s, email: emails.get(s.account_id as string) ?? null })) });
}
