export type Destino = { tipo: "telefone"; valor: string } | { tipo: "email"; valor: string };

/** Celular (com DDD) ou e-mail. Devolve null se não der para entender. */
export function lerDestino(texto: string): Destino | null {
  const t = texto.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return { tipo: "email", valor: t.toLowerCase() };
  const digitos = t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (/^\d{10,11}$/.test(digitos)) return { tipo: "telefone", valor: `+55${digitos}` };
  return null;
}

