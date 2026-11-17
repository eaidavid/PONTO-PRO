/**
 * Limite de pedidos por IP nas rotas abertas (lista de espera, erros, assinatura).
 * Janela deslizante em memória: numa VPS (um processo) vale para todos; na Vercel, por instância,
 * o que já segura robôs simples. Para limite global entre instâncias, trocar por Redis (Upstash).
 */
const janelas = new Map<string, number[]>();
let ultimaLimpeza = 0;

export function ipDe(req: Request): string {
  const encaminhado = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || req.headers.get("x-real-ip") || "desconhecido";
}

/** true se ainda pode; false se passou de `maximo` pedidos em `janelaMs`. */
export function dentroDoLimite(chave: string, maximo: number, janelaMs: number, agora = Date.now()): boolean {
  if (agora - ultimaLimpeza > 60_000) {
    for (const [k, v] of janelas) if (!v.length || agora - v[v.length - 1]! > 10 * 60_000) janelas.delete(k);
    ultimaLimpeza = agora;
  }
  const recentes = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= maximo) {
    janelas.set(chave, recentes);
    return false;
  }
  recentes.push(agora);
  janelas.set(chave, recentes);
  return true;
}

export const respostaLimite = () =>
  Response.json({ erro: "Muitas tentativas seguidas. Espere um minuto e tente de novo." }, { status: 429, headers: { "Retry-After": "60" } });
