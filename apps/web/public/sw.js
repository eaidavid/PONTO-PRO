/*
 * Service worker do Pingou: o app abre e funciona sem internet depois do primeiro acesso.
 * - Telas: rede primeiro (3s), cópia salva se a rede falhar.
 * - Arquivos /_next/static (nome com hash, nunca mudam): cópia salva primeiro.
 * Os dados ficam no IndexedDB, fora deste cache.
 */
const VERSAO = "pp-v2";
const TELAS = ["/", "/hoje", "/registros", "/producao", "/ganhos", "/metas", "/conta", "/comecar"];
const ESTATICOS = "pp-estaticos";
const LIMITE_ESTATICOS = 300;

async function salvarTelasEArquivos() {
  const cache = await caches.open(VERSAO);
  const estaticos = await caches.open(ESTATICOS);
  const arquivos = new Set();
  await Promise.all(
    TELAS.map(async (url) => {
      try {
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) return;
        const html = await resp.clone().text();
        await cache.put(url, resp);
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) arquivos.add(m[0]);
      } catch {
        /* sem rede na instalação: salva depois, no uso */
      }
    }),
  );
  await Promise.all([...arquivos].map((a) => estaticos.add(a).catch(() => {})));
}

self.addEventListener("install", (e) => {
  e.waitUntil(salvarTelasEArquivos().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) if (nome !== VERSAO && nome !== ESTATICOS) await caches.delete(nome);
      const estaticos = await caches.open(ESTATICOS);
      const chaves = await estaticos.keys();
      if (chaves.length > LIMITE_ESTATICOS) await Promise.all(chaves.slice(0, chaves.length - LIMITE_ESTATICOS).map((k) => estaticos.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function comTempo(promessa, ms) {
  return Promise.race([promessa, new Promise((_, nao) => setTimeout(() => nao(new Error("tempo")), ms))]);
}

async function redePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  try {
    const resp = await comTempo(fetch(req), 3000);
    if (resp.ok && resp.type === "basic") cache.put(req, resp.clone());
    return resp;
  } catch {
    const salvo = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
    if (salvo) return salvo;
    if (req.mode === "navigate") return (await cache.match("/hoje")) || (await cache.match("/")) || Response.error();
    return Response.error();
  }
}

async function cacheprimeiro(req) {
  const cache = await caches.open(ESTATICOS);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icones/")) {
    e.respondWith(cacheprimeiro(req));
    return;
  }
  e.respondWith(redePrimeiro(req));
});
