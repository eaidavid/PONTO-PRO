import { timingSafeEqual } from "node:crypto";
import { provedorDoServidor } from "../../../../lib/cobranca/asaas";
import { gravarAssinatura, supabaseServidor } from "../../../../lib/cobranca/servidor";

export const dynamic = "force-dynamic";

function tokenConfere(recebido: string | null, esperado: string) {
  if (!recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Avisos do Asaas: pagamento confirmado, atrasado, assinatura cancelada.
 * Responde 200 para avisos que não interessam (senão o Asaas pausa a fila).
 */
export async function POST(req: Request) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const provedor = provedorDoServidor();
  const sb = supabaseServidor();
  if (!esperado || !provedor || !sb) return new Response("não configurado", { status: 503 });
  if (!tokenConfere(req.headers.get("asaas-access-token"), esperado)) return new Response("não autorizado", { status: 401 });

  const corpo = await req.json().catch(() => null);
  try {
    const mudanca = await provedor.interpretarAviso(corpo);
    if (mudanca) await gravarAssinatura(sb, mudanca);
    return Response.json({ recebido: true });
  } catch (e) {
    console.error("webhook asaas", e);
    // 500: o Asaas tenta de novo depois
    return new Response("erro", { status: 500 });
  }
}
