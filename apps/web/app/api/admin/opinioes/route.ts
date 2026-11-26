import { z } from "zod";
import { registrarAcao, verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
const STATUS = ["novo", "aprovado", "oculto"] as const;

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const status = new URL(req.url).searchParams.get("status");
  let q = a.sb.from("feedback").select("id, user_id, nota, comentario, autoriza, nome, funcao, cidade, status, criado_em").order("criado_em", { ascending: false }).limit(200);
  if (status && (STATUS as readonly string[]).includes(status)) q = q.eq("status", status);
  const [lista, notas] = await Promise.all([q, a.sb.from("feedback").select("nota").not("nota", "is", null).limit(5000)]);
  if (lista.error) return Response.json({ erro: "Não deu para ler as opiniões." }, { status: 500 });
  // NPS: % de notas 9–10 menos % de notas 0–6
  const n = (notas.data ?? []).map((x) => x.nota as number);
  const nps = n.length ? Math.round(((n.filter((x) => x >= 9).length - n.filter((x) => x <= 6).length) / n.length) * 100) : null;
  return Response.json({ opinioes: lista.data ?? [], nps, respostas: n.length });
}

const Mudar = z.object({ id: z.number().int().positive(), status: z.enum(STATUS) });

export async function POST(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const r = Mudar.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  const { error } = await a.sb.from("feedback").update({ status: r.data.status }).eq("id", r.data.id);
  // a regra do banco impede aprovar sem autorização da pessoa
  if (error) return Response.json({ erro: error.code === "23514" ? "Só dá para publicar depoimento que a pessoa autorizou." : "Não deu para mudar." }, { status: error.code === "23514" ? 409 : 500 });
  await registrarAcao(a.sb, a.email, `opiniao-${r.data.status}`, `opiniao:${r.data.id}`);
  return Response.json({ ok: true });
}
