const CACHE = "prime-protocol-v5";
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {})));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Always check the network first for HTML/navigation so a new deployment appears immediately.
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets: cache first, but update in the background.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
