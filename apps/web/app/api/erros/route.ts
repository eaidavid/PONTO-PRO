import { z } from "zod";
import { supabaseServidor } from "../../../lib/cobranca/servidor";
import { dentroDoLimite, ipDe } from "../../../lib/limite";

export const dynamic = "force-dynamic";

const Erro = z.object({
  mensagem: z.string().trim().min(1).transform((s) => s.slice(0, 2000)),
  pilha: z.string().optional().transform((s) => s?.slice(0, 8000)),
  url: z.string().optional().transform((s) => s?.slice(0, 500)),
});

/** Monitor de erros: o app manda o que quebrou no celular de alguém. Sem dados pessoais, só a mensagem e a tela. */
export async function POST(req: Request) {
  // passou do limite: descarta calado (é só registro de erro)
  if (!dentroDoLimite(`erros:${ipDe(req)}`, 20, 10 * 60_000)) return new Response(null, { status: 204 });
  const sb = supabaseServidor();
  if (!sb) return new Response(null, { status: 204 });
  const r = Erro.safeParse(await req.json().catch(() => null));
  if (!r.success) return new Response(null, { status: 400 });
  const agente = req.headers.get("user-agent")?.slice(0, 400) ?? null;
  const { error } = await sb.from("client_errors").insert({ ...r.data, agente });
  if (error) console.error("registro de erro", error);
  return new Response(null, { status: 204 });
}
