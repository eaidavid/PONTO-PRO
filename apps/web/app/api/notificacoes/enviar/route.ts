import { timingSafeEqual } from "node:crypto";
import { agoraEmSaoPaulo, DiaRegistro, PerfilTrabalho } from "@ponto-pro/core";
import webpush from "web-push";
import { supabaseServidor } from "../../../../lib/cobranca/servidor";
import { notificacoesDevidas, type TipoNotificacao } from "../../../../lib/notificacoes/decidir";
import { SITE_URL } from "../../../../lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function tokenConfere(recebido: string | null, esperado: string) {
  if (!recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Chamada a cada 5 minutos pelo agendador do próprio banco (pg_cron + pg_net, migração 0004),
 * no lugar do cron da Vercel. Decide quem precisa de aviso e envia por Web Push.
 */
export async function POST(req: Request) {
  const token = process.env.CRON_TOKEN;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const sb = supabaseServidor();
  if (!token || !publica || !privada || !sb) return new Response("não configurado", { status: 503 });
  if (!tokenConfere(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null, token)) return new Response("não autorizado", { status: 401 });

  webpush.setVapidDetails(SITE_URL, publica, privada);
  const agora = agoraEmSaoPaulo();
  const inicio = Date.now();
  /** Para antes do limite da função; quem ficou de fora recebe na próxima rodada (5 min), sem repetir. */
  const PRAZO_MS = 22_000;
  const LOTE = 200;
  const PARALELO = 25;

  let enviadas = 0;
  let pendentes = 0;
  const vencidas: string[] = [];

  // inscrições em páginas, para não carregar tudo de uma vez
  for (let de = 0; ; de += 1000) {
    const { data: pagina, error } = await sb.from("push_subscriptions").select("endpoint, user_id, p256dh, auth").order("endpoint").range(de, de + 999);
    if (error) return new Response("erro ao ler inscrições", { status: 500 });
    if (!pagina?.length) break;
    const usuarios = [...new Set(pagina.map((i) => i.user_id as string))];

    // dados em lotes de 200 pessoas (o filtro "in" vai na URL e não pode crescer sem limite)
    for (let i = 0; i < usuarios.length; i += LOTE) {
      if (Date.now() - inicio > PRAZO_MS) {
        pendentes += usuarios.length - i;
        continue;
      }
      const lote = usuarios.slice(i, i + LOTE);
      const [perfis, dias, log] = await Promise.all([
        sb.from("work_profiles").select("user_id, dados").in("user_id", lote).eq("apagado", false),
        sb.from("day_entries").select("user_id, dados").in("user_id", lote).eq("chave", agora.data).eq("apagado", false),
        sb.from("notification_log").select("user_id, tipo").in("user_id", lote).eq("dia", agora.data),
      ]);
      const perfilDe = new Map<string, PerfilTrabalho>();
      for (const l of perfis.data ?? []) {
        const r = PerfilTrabalho.safeParse(l.dados);
        if (r.success) perfilDe.set(l.user_id as string, r.data);
      }
      const hojeDe = new Map<string, DiaRegistro>();
      for (const l of dias.data ?? []) {
        const r = DiaRegistro.safeParse(l.dados);
        if (r.success) hojeDe.set(l.user_id as string, r.data);
      }
      const enviadasDe = new Map<string, Set<TipoNotificacao>>();
      for (const l of log.data ?? []) {
        const s = enviadasDe.get(l.user_id as string) ?? new Set();
        s.add(l.tipo as TipoNotificacao);
        enviadasDe.set(l.user_id as string, s);
      }

      // o que mandar para quem
      const envios: { endpoint: string; p256dh: string; auth: string; corpo: string }[] = [];
      const registros: { user_id: string; tipo: TipoNotificacao; dia: string }[] = [];
      for (const usuario of lote) {
        const perfil = perfilDe.get(usuario);
        if (!perfil) continue;
        for (const n of notificacoesDevidas({ perfil, hoje: hojeDe.get(usuario), agora, jaEnviadas: enviadasDe.get(usuario) ?? new Set() })) {
          const corpo = JSON.stringify({ titulo: n.titulo, corpo: n.corpo, url: n.url, tag: n.tipo });
          for (const d of pagina.filter((x) => x.user_id === usuario)) envios.push({ endpoint: d.endpoint as string, p256dh: d.p256dh as string, auth: d.auth as string, corpo });
          registros.push({ user_id: usuario, tipo: n.tipo, dia: agora.data });
        }
      }

      // envia com no máximo 25 ao mesmo tempo
      for (let j = 0; j < envios.length; j += PARALELO) {
        await Promise.all(
          envios.slice(j, j + PARALELO).map((e) =>
            webpush
              .sendNotification({ endpoint: e.endpoint, keys: { p256dh: e.p256dh, auth: e.auth } }, e.corpo, { TTL: 60 * 60, urgency: "normal" })
              .then(() => void enviadas++)
              .catch((err: { statusCode?: number }) => {
                if (err.statusCode === 404 || err.statusCode === 410) vencidas.push(e.endpoint);
              }),
          ),
        );
      }
      if (registros.length) await sb.from("notification_log").upsert(registros, { onConflict: "user_id,tipo,dia", ignoreDuplicates: true });
    }
    if (pagina.length < 1000) break;
  }

  for (let i = 0; i < vencidas.length; i += LOTE) await sb.from("push_subscriptions").delete().in("endpoint", vencidas.slice(i, i + LOTE));
  return Response.json({ enviadas, removidas: vencidas.length, pendentes });
}
