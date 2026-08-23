const CACHE_NAME = "sms-sender-public-v2";
const PUBLIC_ASSETS = [
  "/manifest.webmanifest",
  "/pequenavia-icon.png",
  "/apple-icon",
];

const OFFLINE_DOCUMENT = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#F9F6F2"><title>Sem conexão — PequenaVia SMS</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F9F6F2;color:#2E1E1E;font-family:system-ui,sans-serif}.card{max-width:320px;padding:32px;text-align:center}.icon{display:grid;place-items:center;width:56px;height:56px;margin:0 auto 20px;border-radius:18px;background:#732626;color:#F9F6F2;font-size:28px}h1{font-family:Georgia,serif;font-weight:400;font-size:30px;margin:0 0 12px}p{line-height:1.5;color:#6E6560;margin:0}</style></head><body><main class="card"><div class="icon">↗</div><h1>Você está sem conexão</h1><p>Conecte-se à internet para acessar o PequenaVia SMS. Seus dados e envios não são armazenados neste aparelho.</p></main></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => self.caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => new Response(OFFLINE_DOCUMENT, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      self.caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
