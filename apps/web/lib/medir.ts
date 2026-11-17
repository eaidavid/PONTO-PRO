/**
 * Medição do app e da página de vendas, num lugar só.
 * Cada evento vai para `window.dataLayer` (formato que GA4 e Meta Pixel via GTM leem), sai como evento do
 * navegador "pingou:medir" e é gravado no próprio banco (/api/eventos) para o funil do painel.
 * Nunca mande dado pessoal: só o nome do evento, de onde veio o clique e um identificador aleatório do aparelho.
 */
export const EVENTO_MEDIR = "pingou:medir";

type Dados = Record<string, string | number>;
let fila: { evento: string; dados: Dados }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function lerLocal(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravarLocal(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento */
  }
}

/** Identificador aleatório deste aparelho (não liga a nenhuma pessoa). */
function aparelho(): string {
  let id = lerLocal("pp-aparelho");
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).toLowerCase();
    gravarLocal("pp-aparelho", id);
  }
  return id;
}

/** De onde a pessoa chegou na primeira visita (?origem=indicacao, calculadora…). */
function origemDaVisita(): string {
  const salva = lerLocal("pp-origem");
  if (salva) return salva;
  const daUrl = new URLSearchParams(location.search).get("origem");
  const origem = (daUrl ?? (location.pathname.startsWith("/calculadoras") ? "calculadora" : "site")).replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "site";
  gravarLocal("pp-origem", origem);
  return origem;
}

function enviar() {
  timer = null;
  if (!fila.length) return;
  const corpo = JSON.stringify({ aparelho: aparelho(), eventos: fila.splice(0, 30) });
  try {
    if (navigator.sendBeacon?.("/api/eventos", new Blob([corpo], { type: "application/json" }))) return;
    void fetch("/api/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo, keepalive: true }).catch(() => {});
  } catch {
    /* sem rede: perde o evento, não atrapalha a pessoa */
  }
}

let ouvindoSaida = false;

export function medir(evento: string, dados: Dados = {}) {
  if (typeof window === "undefined") return;
  const w = window as Window & { dataLayer?: unknown[] };
  (w.dataLayer ??= []).push({ event: evento, ...dados });
  window.dispatchEvent(new CustomEvent(EVENTO_MEDIR, { detail: { evento, ...dados } }));
  if (process.env.NODE_ENV !== "production") return;
  fila.push({ evento, dados: { ...dados, origem_visita: origemDaVisita() } });
  if (!ouvindoSaida) {
    ouvindoSaida = true;
    addEventListener("pagehide", enviar);
  }
  if (!timer) timer = setTimeout(enviar, 2000);
}

/** Marca um evento uma vez só neste aparelho (ex.: primeiro ponto, conta criada). */
export function medirUmaVez(evento: string, dados: Dados = {}) {
  const chave = `pp-medido-${evento}`;
  if (lerLocal(chave)) return;
  gravarLocal(chave, "1");
  medir(evento, dados);
}
