"use client";

/** Manda ao servidor os erros que acontecem no celular das pessoas. No máximo 5 por sessão. */
let enviados = 0;
/** Últimos erros desta sessão, para o pedido de suporte (só a mensagem). */
export const ultimosErros: string[] = [];

export function reportarErro(erro: unknown) {
  const msg = erro instanceof Error ? erro.message : String(erro);
  ultimosErros.unshift(msg.slice(0, 200));
  ultimosErros.length = Math.min(ultimosErros.length, 5);
  if (enviados >= 5 || typeof window === "undefined" || process.env.NODE_ENV !== "production") return;
  enviados++;
  const e = erro instanceof Error ? erro : new Error(String(erro));
  const corpo = JSON.stringify({ mensagem: e.message || "erro sem mensagem", pilha: e.stack, url: location.pathname });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/erros", new Blob([corpo], { type: "application/json" }));
    else void fetch("/api/erros", { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo, keepalive: true });
  } catch {
    /* sem rede: deixa pra lá */
  }
}

export function ouvirErros() {
  window.addEventListener("error", (ev) => reportarErro(ev.error ?? ev.message));
  window.addEventListener("unhandledrejection", (ev) => reportarErro(ev.reason));
}
