"use client";

import { ToastProvider } from "@ponto-pro/ui";
import { type ReactNode, useEffect } from "react";
import { manutencao } from "../lib/acoes";
import { useEstado } from "../lib/estado";
import { AgendadorSync } from "../lib/nuvem/agendador";

/** Aplica a aparência salva (Claro, Escuro, Sol forte ou automático). */
function AplicarTema() {
  const estado = useEstado();
  const tema = estado?.preferenciasSalvas ? estado.preferencias.tema : undefined;
  const tamanho = estado?.preferenciasSalvas ? estado.preferencias.tamanho : undefined;
  useEffect(() => {
    if (!tamanho) return;
    const raiz = document.documentElement;
    if (tamanho === "padrao") delete raiz.dataset.tamanho;
    else raiz.dataset.tamanho = tamanho;
    try {
      if (tamanho === "padrao") localStorage.removeItem("pp-tamanho");
      else localStorage.setItem("pp-tamanho", tamanho);
    } catch {
      /* modo privado */
    }
  }, [tamanho]);
  useEffect(() => {
    if (!tema) return;
    const raiz = document.documentElement;
    if (tema === "auto") delete raiz.dataset.tema;
    else raiz.dataset.tema = tema;
    try {
      if (tema === "auto") localStorage.removeItem("pp-tema");
      else localStorage.setItem("pp-tema", tema);
    } catch {
      /* modo privado */
    }
  }, [tema]);
  return null;
}

/** Tarefas ao abrir o app: armazenamento persistente e service worker (funcionar sem internet). */
function AoAbrir() {
  useEffect(() => {
    manutencao();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

export function Provedores({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AplicarTema />
      <AoAbrir />
      <AgendadorSync />
      {children}
    </ToastProvider>
  );
}
