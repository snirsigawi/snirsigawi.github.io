/* He:Bro — lightweight app-shell service worker (hand-written, no build step).
   - Page navigations: network-first, so deploys never leave a stale HTML shell
     that references old JS chunks (which caused infinite loading).
   - Other same-origin GETs: stale-while-revalidate.
   - Cross-origin (Supabase / Google): never intercepted. */
const VERSION = "hebro-v10";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Let the Next.js router own its RSC / prefetch requests: they are aborted by
  // design when a link leaves the viewport, and their payloads must stay fresh.
  if (url.searchParams.has("_rsc")) return;

  // Navigations: network-first; fall back to cache only when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            caches.open(VERSION).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(async () => (await caches.open(VERSION)).match(req)),
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch((err) => {
          // A cancelled request (navigation/unmount) has nothing to fall back to;
          // rethrow instead of resolving with `undefined`.
          if (cached) return cached;
          throw err;
        });
      return cached || network;
    })(),
  );
});
