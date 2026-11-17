import { verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
const FILTROS = new Set(["todas", "ativas", "pro", "teste", "paradas"]);

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const u = new URL(req.url);
  const busca = (u.searchParams.get("busca") ?? "").trim().slice(0, 100);
  const filtro = FILTROS.has(u.searchParams.get("filtro") ?? "") ? u.searchParams.get("filtro")! : "todas";
  const pagina = Math.max(0, Number(u.searchParams.get("pagina")) || 0);
  const { data, error } = await a.sb.rpc("admin_pessoas", { busca, filtro, limite: 50, desloc: pagina * 50 });
  if (error) return Response.json({ erro: "Não deu para ler as pessoas." }, { status: 500 });
  return Response.json({ pessoas: data ?? [], total: data?.[0]?.total ?? 0 });
}
