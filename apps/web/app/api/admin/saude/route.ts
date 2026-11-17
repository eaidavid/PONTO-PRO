import { verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const { data, error } = await a.sb.rpc("admin_saude");
  if (error) return Response.json({ erro: "Não deu para ler a saúde." }, { status: 500 });
  return Response.json(data);
}
