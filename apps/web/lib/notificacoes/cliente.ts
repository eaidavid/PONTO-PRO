"use client";

import { supabase } from "../nuvem/supabase";

const CHAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type SituacaoAvisos = "sem-suporte" | "instalar-primeiro" | "bloqueado" | "desligado" | "ligado";

function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** No iPhone, notificação só funciona com o app na tela inicial. */
export function noIphoneSemInstalar(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !instalado;
}

export async function situacaoAvisos(): Promise<SituacaoAvisos> {
  if (!CHAVE || !("serviceWorker" in navigator)) return "sem-suporte";
  if (!("PushManager" in window) || !("Notification" in window)) return noIphoneSemInstalar() ? "instalar-primeiro" : "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao && Notification.permission === "granted" ? "ligado" : "desligado";
}

/** Pede permissão, inscreve o aparelho e guarda a inscrição na conta. Precisa estar logado. */
export async function ligarAvisos(): Promise<SituacaoAvisos> {
  if (!CHAVE) return "sem-suporte";
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desligado";
  const reg = await navigator.serviceWorker.ready;
  const inscricao = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE) }));
  const j = inscricao.toJSON();
  const { error } = await supabase()
    .from("push_subscriptions")
    .upsert({ endpoint: inscricao.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" }, { onConflict: "endpoint" });
  if (error) throw error;
  return "ligado";
}

export async function desligarAvisos(): Promise<SituacaoAvisos> {
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  if (inscricao) {
    await supabase().from("push_subscriptions").delete().eq("endpoint", inscricao.endpoint);
    await inscricao.unsubscribe();
  }
  return "desligado";
}
