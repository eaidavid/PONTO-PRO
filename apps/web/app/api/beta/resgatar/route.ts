import { z } from "zod";
import { supabaseServidor } from "../../../../lib/cobranca/servidor";
import { dentroDoLimite, ipDe, respostaLimite } from "../../../../lib/limite";

export const dynamic = "force-dynamic";

const MOTIVOS: Record<string, string> = {
  invalido: "Esse convite não vale mais.",
  "ja-usou": "Você já usou um convite do beta.",
  esgotado: "As vagas desse convite acabaram.",
  "sem-conta": "Entre na sua conta para liberar o Pro.",
  "ja-assina": "Você já assina o Pro.",
};

/** Resgata o convite do beta na conta de quem está logado: Pro de cortesia pelos dias do convite. */
export async function POST(req: Request) {
  if (!dentroDoLimite(`resgate:${ipDe(req)}`, 10, 10 * 60_000)) return respostaLimite();
  const sb = supabaseServidor();
  if (!sb) return Response.json({ erro: "O beta ainda não está aberto." }, { status: 503 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: u } = token ? await sb.auth.getUser(token) : { data: { user: null } };
  if (!u.user) return Response.json({ erro: MOTIVOS["sem-conta"], motivo: "sem-conta" }, { status: 401 });
  const r = z.object({ codigo: z.string().regex(/^[A-Za-z0-9-]{3,30}$/) }).safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erro: MOTIVOS.invalido, motivo: "invalido" }, { status: 400 });
  const { data, error } = await sb.rpc("resgatar_convite", { alvo: u.user.id, cod: r.data.codigo });
  if (error) {
    console.error("resgatar convite", error);
    return Response.json({ erro: "Não deu para liberar agora. Tente de novo em instantes." }, { status: 502 });
  }
  const res = data as { ok: boolean; motivo?: string; dias?: number; pagoAte?: string };
  if (!res.ok) return Response.json({ erro: MOTIVOS[res.motivo ?? ""] ?? MOTIVOS.invalido, motivo: res.motivo }, { status: 409 });
  return Response.json({ ok: true, dias: res.dias, pagoAte: res.pagoAte });
}
