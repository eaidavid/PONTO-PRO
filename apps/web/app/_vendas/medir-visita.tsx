"use client";

import { useEffect } from "react";
import { medir } from "../../lib/medir";

/** Conta a visita a uma página aberta (vendas ou calculadora) para o funil. */
export function MedirVisita({ evento, secao }: { evento: "visita_vendas" | "visita_calculadora"; secao?: string }) {
  useEffect(() => {
    medir(evento, secao ? { secao } : {});
  }, [evento, secao]);
  return null;
}
