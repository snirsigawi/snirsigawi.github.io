/* He:Bro — lightweight app-shell service worker (hand-written, no build step).
   - Page navigations: network-first with a timeout; on failure/timeout serve the
     cached shell, so a flaky network never looks like "the site doesn't exist".
   - Other same-origin GETs: stale-while-revalidate.
   - Cross-origin (Supabase / Google): never intercepted. */
const VERSION = "hebro-v11";
const NAV_TIMEOUT_MS = 8000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("network timeout")), ms),
    ),
  ]);
}

self.addEventListener("install", (event) => {
  // Pre-cache the app shell so a failed first navigation can still render.
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add("/"))
      .catch(() => undefined),
  );
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

  // Navigations: network-first; fall back to cache when offline or slow.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        try {
          const res = await withTimeout(fetch(req), NAV_TIMEOUT_MS);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const cached =
            (await cache.match(req)) ||
            (await cache.match(url.pathname)) ||
            (await cache.match("/")) ||
            (await cache.match("/index.html"));
          return cached || Response.error();
        }
      })(),
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
