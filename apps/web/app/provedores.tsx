"use client";

import { ToastProvider } from "@ponto-pro/ui";
import type { ReactNode } from "react";

export function Provedores({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
