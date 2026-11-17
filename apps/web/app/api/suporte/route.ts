import { z } from "zod";
import { supabaseServidor } from "../../../lib/cobranca/servidor";
import { dentroDoLimite, ipDe, respostaLimite } from "../../../lib/limite";

export const dynamic = "force-dynamic";

const Pedido = z.object({
  mensagem: z.string().trim().min(3, "Conte o que aconteceu").max(2000),
  email: z.string().trim().email().max(200).optional(),
  whatsapp: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^(55)?[1-9][0-9]{9,10}$/)).optional(),
  tecnico: z.record(z.string(), z.unknown()).default({}),
  /** Registros do período: só vem se a pessoa marcou a autorização. */
  registros: z.record(z.string(), z.unknown()).optional(),
});

/** Pedido de suporte. Os registros, quando autorizados, são apagados em 30 dias. */
export async function POST(req: Request) {
  if (!dentroDoLimite(`suporte:${ipDe(req)}`, 5, 60 * 60_000)) return respostaLimite();
  const sb = supabaseServidor();
  if (!sb) return Response.json({ erro: "O suporte pelo app ainda não está disponível. Fale com a gente pelo e-mail dos Termos." }, { status: 503 });
  const r = Pedido.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erro: r.error.issues[0]?.message ?? "Confira os campos." }, { status: 400 });

  // com conta, o pedido fica ligado a ela; sem conta, precisa de um contato
  let userId: string | null = null;
  let emailConta: string | null = null;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const { data } = await sb.auth.getUser(token);
    userId = data.user?.id ?? null;
    emailConta = data.user?.email ?? null;
  }
  const email = r.data.email ?? emailConta;
  if (!email && !r.data.whatsapp) return Response.json({ erro: "Deixe um e-mail ou WhatsApp para a resposta." }, { status: 400 });

  const tecnico = JSON.stringify(r.data.tecnico).length <= 12_000 ? r.data.tecnico : { aviso: "informações técnicas grandes demais" };
  const registros = r.data.registros && JSON.stringify(r.data.registros).length <= 350_000 ? r.data.registros : null;
  const { data, error } = await sb
    .from("support_requests")
    .insert({
      user_id: userId,
      email,
      contato: r.data.whatsapp ? `whatsapp:${r.data.whatsapp}` : `email:${email}`,
      mensagem: r.data.mensagem,
      tecnico,
      registros,
      registros_expira: registros ? new Date(Date.now() + 30 * 86_400_000).toISOString() : null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("suporte", error);
    return Response.json({ erro: "Não deu para mandar agora. Tente de novo em instantes." }, { status: 502 });
  }
  return Response.json({ ok: true, protocolo: data.id });
}
