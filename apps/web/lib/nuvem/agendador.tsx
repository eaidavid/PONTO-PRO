"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef } from "react";
import { db } from "../db";
import { lerStatus, mudarStatus, NUVEM_CONFIGURADA, registrarPedido } from "./status";

const INTERVALO = 60_000;
const ESPERA_DEPOIS_DE_SALVAR = 3_000;

/**
 * Sincroniza sozinho: ao abrir, ao voltar a internet, a cada minuto e logo depois de salvar algo.
 * Sem servidor configurado, não faz nada (o app funciona só no celular).
 */
export function AgendadorSync() {
  const pendentes = useLiveQuery(() => db.fila.count(), []);
  const rodar = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!NUVEM_CONFIGURADA) return;
    let vivo = true;
    let rodando = false;
    let deNovo = false;
    let desinscrever: (() => void) | undefined;

    async function executar() {
      if (rodando) {
        deNovo = true;
        return;
      }
      const { usuario } = lerStatus();
      if (!usuario || !navigator.onLine) return;
      rodando = true;
      mudarStatus({ fase: "sincronizando" });
      try {
        const [{ sincronizar }, { remotoSupabase }] = await Promise.all([import("./sincronizar"), import("./supabase")]);
        await sincronizar(remotoSupabase, usuario.id);
        if (vivo) mudarStatus({ fase: "parado", ultimaEm: new Date().toISOString() });
      } catch {
        if (vivo) mudarStatus({ fase: "erro" });
      } finally {
        rodando = false;
        if (deNovo && vivo) {
          deNovo = false;
          executar();
        }
      }
    }
    rodar.current = executar;
    registrarPedido(executar);

    (async () => {
      const { supabase } = await import("./supabase");
      const { data } = supabase().auth.onAuthStateChange((_evento, sessao) => {
        const u = sessao?.user;
        const antes = lerStatus().usuario?.id;
        mudarStatus({ usuario: u ? { id: u.id, email: u.email, telefone: u.phone || undefined } : null });
        if (u && u.id !== antes) executar();
      });
      desinscrever = () => data.subscription.unsubscribe();
    })();

    const id = setInterval(executar, INTERVALO);
    window.addEventListener("online", executar);
    const aoVoltar = () => document.visibilityState === "visible" && executar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      clearInterval(id);
      window.removeEventListener("online", executar);
      document.removeEventListener("visibilitychange", aoVoltar);
      registrarPedido(null);
      desinscrever?.();
    };
  }, []);

  useEffect(() => {
    if (!pendentes) return;
    const t = setTimeout(() => rodar.current?.(), ESPERA_DEPOIS_DE_SALVAR);
    return () => clearTimeout(t);
  }, [pendentes]);

  return null;
}
