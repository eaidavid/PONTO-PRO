import { verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

/** Diz se quem pede tem acesso ao painel. */
export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  return Response.json({ email: a.email });
}
