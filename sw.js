// Slagvaardig — service worker
// Netwerk-eerst: als je online bent krijg je altijd de nieuwste versie.
// Cache dient alleen als offline-terugval (handig op de baan zonder bereik).
// Verhoog VERSION bij elke nieuwe versie (gelijk aan APP_VERSION in index.html).

const VERSION = "3";
const CACHE = "slagvaardig-v" + VERSION;

self.addEventListener("install", (event) => {
  // Nieuwe versie meteen klaarzetten, niet wachten tot alle tabs dicht zijn.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Ruim alle oude caches op (ook de oude "sticky" cache die je moest wissen).
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// De pagina kan vragen om meteen over te schakelen naar de nieuwe versie.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Externe verzoeken (bv. de weer-API) volledig met rust laten.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Netwerk eerst — no-store zodat er geen oude versie uit de browsercache komt.
      const fresh = await fetch(req, { cache: "no-store" });
      if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      // Offline: geef terug wat we hebben.
      const cached = await cache.match(req);
      if (cached) return cached;
      if (req.mode === "navigate") {
        const idx = (await cache.match("./index.html")) || (await cache.match("./"));
        if (idx) return idx;
      }
      throw e;
    }
  })());
});
