import { verificarAdmin } from "../../../../lib/admin";
import { receitaMensal } from "../../../../lib/admin-numeros";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const hoje = new Date().toISOString().slice(0, 10);
  const [resumo, subs, metas] = await Promise.all([
    a.sb.rpc("admin_resumo"),
    a.sb.from("subscriptions").select("plano, ciclo, trabalhadores, provedor, status, pago_ate"),
    a.sb.rpc("admin_metas"),
  ]);
  if (resumo.error || subs.error) return Response.json({ erro: "Não deu para ler o resumo." }, { status: 500 });
  const linhas = subs.data ?? [];
  const vigentes = linhas.filter((s) => s.status !== "cancelada" && s.pago_ate >= hoje);
  return Response.json({
    ...resumo.data,
    assinantes: vigentes.filter((s) => s.provedor !== "cortesia").length,
    anuais: vigentes.filter((s) => s.provedor !== "cortesia" && s.ciclo === "anual").length,
    cortesias: vigentes.filter((s) => s.provedor === "cortesia").length,
    atrasadas: linhas.filter((s) => s.status === "atrasada").length,
    receita: receitaMensal(linhas, hoje),
    // sem a função (banco ainda sem a migração 0007), as metas só não aparecem
    metas: metas.error ? null : metas.data,
  });
}
