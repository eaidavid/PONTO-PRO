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

  const { data: inscricoes, error } = await sb.from("push_subscriptions").select("endpoint, user_id, p256dh, auth");
  if (error) return new Response("erro ao ler inscrições", { status: 500 });
  const usuarios = [...new Set((inscricoes ?? []).map((i) => i.user_id as string))];
  if (!usuarios.length) return Response.json({ enviadas: 0 });

  const [perfis, dias, log] = await Promise.all([
    sb.from("work_profiles").select("user_id, dados").in("user_id", usuarios).eq("apagado", false),
    sb.from("day_entries").select("user_id, dados").in("user_id", usuarios).eq("chave", agora.data).eq("apagado", false),
    sb.from("notification_log").select("user_id, tipo").in("user_id", usuarios).eq("dia", agora.data),
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

  let enviadas = 0;
  const vencidas: string[] = [];
  for (const usuario of usuarios) {
    const perfil = perfilDe.get(usuario);
    if (!perfil) continue;
    const devidas = notificacoesDevidas({ perfil, hoje: hojeDe.get(usuario), agora, jaEnviadas: enviadasDe.get(usuario) ?? new Set() });
    for (const n of devidas) {
      const destinos = (inscricoes ?? []).filter((i) => i.user_id === usuario);
      const corpo = JSON.stringify({ titulo: n.titulo, corpo: n.corpo, url: n.url, tag: n.tipo });
      await Promise.all(
        destinos.map((d) =>
          webpush
            .sendNotification({ endpoint: d.endpoint as string, keys: { p256dh: d.p256dh as string, auth: d.auth as string } }, corpo, { TTL: 60 * 60, urgency: "normal" })
            .then(() => void enviadas++)
            .catch((e: { statusCode?: number }) => {
              if (e.statusCode === 404 || e.statusCode === 410) vencidas.push(d.endpoint as string);
            }),
        ),
      );
      await sb.from("notification_log").insert({ user_id: usuario, tipo: n.tipo, dia: agora.data });
    }
  }
  if (vencidas.length) await sb.from("push_subscriptions").delete().in("endpoint", vencidas);
  return Response.json({ enviadas, removidas: vencidas.length });
}
