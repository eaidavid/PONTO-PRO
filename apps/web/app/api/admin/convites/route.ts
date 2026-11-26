import { z } from "zod";
import { registrarAcao, verificarAdmin } from "../../../../lib/admin";
import { codigoDoNome } from "../../../../lib/beta";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const { data, error } = await a.sb.from("beta_invites").select("codigo, nome, dias, limite, usados, ativo, criado_em").order("criado_em", { ascending: false });
  if (error) return Response.json({ erro: "Não deu para ler os convites." }, { status: 500 });
  return Response.json({ convites: data ?? [] });
}

const Acao = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("criar"),
    nome: z.string().trim().min(1).max(80),
    codigo: z.string().trim().max(30).optional(),
    dias: z.number().int().min(1).max(366).default(90),
    limite: z.number().int().min(1).max(1000).optional(),
  }),
  z.object({ acao: z.literal("ativo"), codigo: z.string().max(30), ativo: z.boolean() }),
]);

export async function POST(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const r = Acao.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  if (r.data.acao === "ativo") {
    const { error } = await a.sb.from("beta_invites").update({ ativo: r.data.ativo }).eq("codigo", r.data.codigo);
    if (error) return Response.json({ erro: "Não deu para mudar o convite." }, { status: 500 });
    await registrarAcao(a.sb, a.email, r.data.ativo ? "convite-ligar" : "convite-desligar", `convite:${r.data.codigo}`);
    return Response.json({ ok: true });
  }
  const codigo = codigoDoNome(r.data.codigo || r.data.nome);
  if (codigo.length < 3) return Response.json({ erro: "Use um código com pelo menos 3 letras ou números." }, { status: 400 });
  const { error } = await a.sb.from("beta_invites").insert({ codigo, nome: r.data.nome, dias: r.data.dias, limite: r.data.limite ?? null });
  if (error) return Response.json({ erro: error.code === "23505" ? "Já existe um convite com esse código." : "Não deu para criar o convite." }, { status: error.code === "23505" ? 409 : 500 });
  await registrarAcao(a.sb, a.email, "convite-criar", `convite:${codigo}`, { dias: r.data.dias, limite: r.data.limite ?? null });
  return Response.json({ ok: true, codigo });
}
