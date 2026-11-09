"use client";

import { useSyncExternalStore } from "react";

/** Evento do Chrome/Android que permite instalar o app na tela inicial. */
interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let evento: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e as EventoInstalar;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    avisar();
  });
}

/** true quando o celular permite instalar o app agora. */
export function usePodeInstalar(): boolean {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => evento !== null,
    () => false,
  );
}

export async function instalarApp(): Promise<boolean> {
  if (!evento) return false;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  evento = null;
  avisar();
  return outcome === "accepted";
}
