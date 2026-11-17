import { verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const u = new URL(req.url);
  const dias = [1, 7, 30, 90].includes(Number(u.searchParams.get("dias"))) ? Number(u.searchParams.get("dias")) : 7;
  const origem = (u.searchParams.get("origem") ?? "").slice(0, 40);
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const [funil, assinou] = await Promise.all([
    a.sb.rpc("admin_funil", { desde, origem }),
    a.sb.from("subscriptions").select("account_id", { count: "exact", head: true }).neq("provedor", "cortesia").gte("criado_em", desde),
  ]);
  if (funil.error) return Response.json({ erro: "Não deu para ler o funil." }, { status: 500 });
  return Response.json({ linhas: funil.data ?? [], assinaram: assinou.count ?? 0, dias, origem });
}
