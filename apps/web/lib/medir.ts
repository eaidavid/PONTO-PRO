/**
 * Medição da página de vendas, num lugar só.
 * Hoje não há provedor ligado: o evento vai para `window.dataLayer` (formato que GA4 e Meta Pixel via GTM leem)
 * e sai como evento do navegador "pingou:medir". Para ligar um provedor, basta ouvir aqui.
 * Nunca mande dado pessoal: só o nome do evento e de onde veio o clique.
 */
export const EVENTO_MEDIR = "pingou:medir";

export function medir(evento: string, dados: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const w = window as Window & { dataLayer?: unknown[] };
  (w.dataLayer ??= []).push({ event: evento, ...dados });
  window.dispatchEvent(new CustomEvent(EVENTO_MEDIR, { detail: { evento, ...dados } }));
}
