import { z } from "zod";
import { registrarAcao, verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
const STATUS = ["aberto", "respondido", "fechado"] as const;

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const status = new URL(req.url).searchParams.get("status");
  let q = a.sb.from("support_requests").select("id, email, contato, mensagem, tecnico, registros, registros_expira, status, criado_em, atualizado_em").order("criado_em", { ascending: false }).limit(100);
  if (status && (STATUS as readonly string[]).includes(status)) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return Response.json({ erro: "Não deu para ler o suporte." }, { status: 500 });
  return Response.json({ pedidos: data ?? [] });
}

const Mudar = z.object({ id: z.number().int().positive(), status: z.enum(STATUS) });

export async function POST(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const r = Mudar.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  const { error } = await a.sb.from("support_requests").update({ status: r.data.status, atualizado_em: new Date().toISOString() }).eq("id", r.data.id);
  if (error) return Response.json({ erro: "Não deu para mudar o pedido." }, { status: 500 });
  await registrarAcao(a.sb, a.email, `suporte-${r.data.status}`, `suporte:${r.data.id}`);
  return Response.json({ ok: true });
}
