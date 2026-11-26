import { supabaseServidor } from "../../../lib/cobranca/servidor";
import { dentroDoLimite, ipDe, respostaLimite } from "../../../lib/limite";

export const dynamic = "force-dynamic";

/** Confere um convite do beta antes de a pessoa começar. Não revela o nome interno do convite. */
export async function GET(req: Request) {
  if (!dentroDoLimite(`beta:${ipDe(req)}`, 30, 10 * 60_000)) return respostaLimite();
  const codigo = (new URL(req.url).searchParams.get("codigo") ?? "").toUpperCase().slice(0, 30);
  const sb = supabaseServidor();
  if (!sb || !/^[A-Z0-9-]{3,30}$/.test(codigo)) return Response.json({ valido: false });
  const { data } = await sb.from("beta_invites").select("dias, limite, usados, ativo").eq("codigo", codigo).maybeSingle();
  const valido = !!data && data.ativo && (data.limite === null || data.usados < data.limite);
  return Response.json(valido ? { valido, dias: data.dias } : { valido: false });
}
