/* Alma Milongueira — service worker (offline básico) */
const VERSAO = "galpao-v5";
const CACHE_PAGINAS = `${VERSAO}-paginas`;
const CACHE_ESTATICO = `${VERSAO}-estatico`;

const PAGINAS = ["/", "/entrar", "/projetos", "/projeto", "/ideias", "/conta", "/offline"];
const EXTRAS = ["/manifest.webmanifest", "/worklets/gravador.js", "/icones/icone-192.png", "/icones/icone-512.png", "/icones/icone.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const paginas = await caches.open(CACHE_PAGINAS);
      const estatico = await caches.open(CACHE_ESTATICO);
      await Promise.all(
        PAGINAS.map(async (url) => {
          try {
            const resp = await fetch(url, { cache: "no-store" });
            if (!resp.ok) return;
            await paginas.put(url, resp.clone());
            // Guarda também os scripts/estilos que a página usa
            const html = await resp.text();
            const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
            await Promise.all([...new Set(assets)].map((a) => estatico.add(a).catch(() => {})));
          } catch {
            /* sem rede na instalação: segue */
          }
        }),
      );
      await Promise.all(EXTRAS.map((u) => estatico.add(u).catch(() => {})));
      // Sons dos instrumentos (~2,5 MB): ficam no aparelho pra tocar sem internet
      try {
        const lista = await (await fetch("/sons/lista.json")).json();
        const urls = Object.entries(lista).flatMap(([inst, notas]) => notas.map((m) => `/sons/${inst}/${m}.mp3`));
        await Promise.all(urls.map((u) => estatico.add(u).catch(() => {})));
      } catch {}
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, IA etc. vão direto pra rede
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (url.searchParams.has("_rsc") || req.headers.get("RSC")) return;

  if (req.mode === "navigate") {
    event.respondWith(navegacao(req, url));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icones/") || url.pathname.startsWith("/sons/")) {
    event.respondWith(cachePrimeiroEstatico(req));
    return;
  }
  event.respondWith(revalidarEmSegundoPlano(req));
});

async function navegacao(req, url) {
  const cache = await caches.open(CACHE_PAGINAS);
  try {
    const resp = await fetch(req);
    if (resp.ok && PAGINAS.includes(url.pathname)) cache.put(url.pathname, resp.clone());
    return resp;
  } catch {
    const salvo = (await cache.match(url.pathname)) || (await cache.match(req, { ignoreSearch: true }));
    return salvo || (await cache.match("/offline")) || new Response("Sem sinal", { status: 503 });
  }
}

async function cachePrimeiroEstatico(req) {
  const cache = await caches.open(CACHE_ESTATICO);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

async function revalidarEmSegundoPlano(req) {
  const cache = await caches.open(CACHE_ESTATICO);
  const salvo = await cache.match(req);
  const rede = fetch(req)
    .then((resp) => {
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => salvo);
  return salvo || rede;
}
