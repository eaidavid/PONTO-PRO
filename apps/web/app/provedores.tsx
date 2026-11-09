"use client";

import { ToastProvider } from "@ponto-pro/ui";
import { type ReactNode, useEffect } from "react";
import { useEstado } from "../lib/estado";

/** Aplica a aparência salva (Claro, Escuro, Sol forte ou automático). */
function AplicarTema() {
  const estado = useEstado();
  const tema = estado?.preferenciasSalvas ? estado.preferencias.tema : undefined;
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

export function Provedores({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AplicarTema />
      {children}
    </ToastProvider>
  );
}
