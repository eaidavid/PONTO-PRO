import { z } from "zod";
import { supabaseServidor } from "../../../lib/cobranca/servidor";
import { dentroDoLimite, ipDe, respostaLimite } from "../../../lib/limite";

export const dynamic = "force-dynamic";

const Pedido = z.object({
  nota: z.number().int().min(0).max(10),
  comentario: z.string().trim().max(1000).optional(),
  autoriza: z.boolean().default(false),
  nome: z.string().trim().max(40).optional(),
  funcao: z.string().trim().max(40).optional(),
  cidade: z.string().trim().max(60).optional(),
});

/** Opinião do beta (nota de 0 a 10, comentário e, se a pessoa quiser, autorização para publicar). */
export async function POST(req: Request) {
  if (!dentroDoLimite(`opiniao:${ipDe(req)}`, 5, 60 * 60_000)) return respostaLimite();
  const sb = supabaseServidor();
  if (!sb) return Response.json({ erro: "Não deu para mandar agora." }, { status: 503 });
  const r = Pedido.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erro: "Escolha uma nota de 0 a 10." }, { status: 400 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const userId = token ? ((await sb.auth.getUser(token)).data.user?.id ?? null) : null;
  // autorização só vale com texto e nome: é o que vai para a página
  const autoriza = r.data.autoriza && !!r.data.comentario && !!r.data.nome;
  const linha = {
    user_id: userId,
    nota: r.data.nota,
    comentario: r.data.comentario || null,
    autoriza,
    nome: r.data.nome || null,
    funcao: r.data.funcao || null,
    cidade: r.data.cidade || null,
    status: "novo",
    criado_em: new Date().toISOString(),
  };
  const { error } = userId ? await sb.from("feedback").upsert(linha, { onConflict: "user_id" }) : await sb.from("feedback").insert(linha);
  if (error) {
    console.error("opiniao", error);
    return Response.json({ erro: "Não deu para mandar agora. Tente de novo em instantes." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
