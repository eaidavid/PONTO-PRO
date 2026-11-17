import { somarDias } from "@ponto-pro/core";
import { z } from "zod";
import { registrarAcao, verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
const Id = z.string().uuid();

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const id = Id.safeParse(new URL(req.url).searchParams.get("id"));
  if (!id.success) return Response.json({ erro: "Pessoa inválida." }, { status: 400 });
  const { data, error } = await a.sb.rpc("admin_pessoa", { alvo: id.data });
  if (error || !data) return Response.json({ erro: "Pessoa não encontrada." }, { status: 404 });
  return Response.json(data);
}

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("cortesia"), id: Id, dias: z.number().int().min(1).max(366) }),
  z.object({ acao: z.literal("tirar-cortesia"), id: Id }),
  z.object({ acao: z.literal("apagar"), id: Id, confirmacao: z.string() }),
]);

/** Ações sobre uma pessoa: dar ou tirar Pro de cortesia, apagar a conta (LGPD). Todas ficam registradas. */
export async function POST(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const r = Acao.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  const { data: membro } = await a.sb.from("members").select("account_id").eq("user_id", r.data.id).eq("papel", "dono").maybeSingle();
  const conta = membro?.account_id as string | undefined;

  if (r.data.acao === "cortesia") {
    if (!conta) return Response.json({ erro: "Essa pessoa ainda não tem conta completa." }, { status: 409 });
    const { data: atual } = await a.sb.from("subscriptions").select("provedor, status, pago_ate").eq("account_id", conta).maybeSingle();
    if (atual && atual.provedor !== "cortesia" && atual.status !== "cancelada") return Response.json({ erro: "Essa pessoa já tem uma assinatura paga." }, { status: 409 });
    const pagoAte = somarDias(new Date().toISOString().slice(0, 10), r.data.dias);
    const { error } = await a.sb
      .from("subscriptions")
      .upsert({ account_id: conta, plano: "individual", status: "ativa", ciclo: "mensal", pago_ate: pagoAte, provedor: "cortesia", trabalhadores: 1, atualizado_em: new Date().toISOString() }, { onConflict: "account_id" });
    if (error) return Response.json({ erro: "Não deu para dar a cortesia." }, { status: 500 });
    await registrarAcao(a.sb, a.email, "cortesia", r.data.id, { dias: r.data.dias, pagoAte });
    return Response.json({ ok: true, pagoAte });
  }

  if (r.data.acao === "tirar-cortesia") {
    if (conta) await a.sb.from("subscriptions").delete().eq("account_id", conta).eq("provedor", "cortesia");
    await registrarAcao(a.sb, a.email, "tirar-cortesia", r.data.id);
    return Response.json({ ok: true });
  }

  // apagar: precisa digitar o e-mail da pessoa
  const { data: usuario } = await a.sb.auth.admin.getUserById(r.data.id);
  if (!usuario.user || usuario.user.email?.toLowerCase() !== r.data.confirmacao.trim().toLowerCase()) {
    return Response.json({ erro: "Digite o e-mail da pessoa para confirmar." }, { status: 400 });
  }
  if (conta) await a.sb.from("accounts").delete().eq("id", conta);
  const { error } = await a.sb.auth.admin.deleteUser(r.data.id);
  if (error) return Response.json({ erro: "Não deu para apagar a conta." }, { status: 500 });
  await registrarAcao(a.sb, a.email, "apagar-conta", r.data.id, { email: usuario.user.email });
  return Response.json({ ok: true });
}
