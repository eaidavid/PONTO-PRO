"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEstado } from "../../lib/estado";

/** Quem já configurou o app não precisa da página de vendas: vai direto para Hoje. */
export function IrParaOApp() {
  const estado = useEstado();
  const router = useRouter();
  useEffect(() => {
    if (estado?.perfil) router.replace("/hoje");
  }, [estado, router]);
  return null;
}
