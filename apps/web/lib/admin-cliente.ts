"use client";

import { useCallback, useEffect, useState } from "react";

/** Pedido ao servidor do painel, com o token da conta logada. */
export async function pedirAdmin<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { supabase } = await import("./nuvem/supabase");
  const token = (await supabase().auth.getSession()).data.session?.access_token;
  if (!token) throw Object.assign(new Error("Entre com a sua conta."), { status: 401 });
  const r = await fetch(url, { ...init, headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers, Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const corpo = (await r.json().catch(() => ({}))) as { erro?: string };
    throw Object.assign(new Error(corpo.erro ?? "Não deu certo agora."), { status: r.status });
  }
  return (r.headers.get("content-type")?.includes("json") ? r.json() : r.text()) as Promise<T>;
}

/** Lê um endereço do painel e guarda o resultado. `recarregar` busca de novo. */
export function useAdmin<T>(url: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const recarregar = useCallback(async () => {
    if (!url) return;
    setCarregando(true);
    setErro(null);
    try {
      setDados(await pedirAdmin<T>(url));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo agora.");
    } finally {
      setCarregando(false);
    }
  }, [url]);
  useEffect(() => {
    void recarregar();
  }, [recarregar]);
  return { dados, erro, carregando, recarregar };
}

export const dataHora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "—";
export const dataCurtaBr = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}${iso.slice(0, 4) !== new Date().toISOString().slice(0, 4) ? `/${iso.slice(2, 4)}` : ""}` : "—");

/** "agora", "há 2 h", "ontem", "há 3 dias", "há 2 meses". */
export function haQuanto(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 60) return min < 2 ? "agora" : `há ${min} min`;
  if (min < 24 * 60) return `há ${Math.floor(min / 60)} h`;
  const dias = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return `há ${Math.floor(dias / 30)} ${dias < 60 ? "mês" : "meses"}`;
}
