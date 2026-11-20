import { verificarAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

const csv = (v: unknown) => {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const a = await verificarAdmin(req);
  if (a instanceof Response) return a;
  const { data, error } = await a.sb.from("waitlist").select("plano, nome, whatsapp, pessoas, origem, criado_em").order("criado_em", { ascending: false }).limit(5000);
  if (error) return Response.json({ erro: "Não deu para ler a lista." }, { status: 500 });
  if (new URL(req.url).searchParams.get("formato") === "csv") {
    const linhas = [["Plano", "Nome", "WhatsApp", "Pessoas", "Origem", "Quando"], ...(data ?? []).map((l) => [l.plano === "equipe" ? "Turma" : "Pro", l.nome, l.whatsapp, l.pessoas ?? "", l.origem, l.criado_em])];
    return new Response(`﻿${linhas.map((l) => l.map(csv).join(";")).join("\n")}`, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="lista-de-espera.csv"' },
    });
  }
  return Response.json({ lista: data ?? [] });
}
