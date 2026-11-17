import { z } from "zod";
import { supabaseServidor } from "../../../lib/cobranca/servidor";
import { dentroDoLimite, ipDe, respostaLimite } from "../../../lib/limite";

export const dynamic = "force-dynamic";

const Pedido = z.object({
  plano: z.literal("equipe"),
  nome: z.string().trim().min(2).max(80),
  /** Só números, com DDD; o 55 do Brasil é opcional. */
  whatsapp: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^(55)?[1-9][0-9]{9,10}$/)),
  pessoas: z.number().int().min(1).max(500).optional(),
  origem: z.enum(["app", "site"]).default("site"),
});

const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

/** Lista de espera de planos que ainda não estão à venda (hoje, a Turma). Repetir o mesmo WhatsApp não duplica. */
export async function POST(req: Request) {
  if (!dentroDoLimite(`espera:${ipDe(req)}`, 5, 10 * 60_000)) return respostaLimite();
  const sb = supabaseServidor();
  if (!sb) return erro(503, "A lista de espera ainda não está aberta. Tente de novo em alguns dias.");
  const r = Pedido.safeParse(await req.json().catch(() => null));
  if (!r.success) return erro(400, "Confira o nome e o WhatsApp com DDD.");
  const { error } = await sb.from("waitlist").upsert(r.data, { onConflict: "plano,whatsapp", ignoreDuplicates: true });
  if (error) {
    console.error("lista de espera", error);
    return erro(502, "Não deu para salvar agora. Tente de novo em instantes.");
  }
  return Response.json({ ok: true });
}
