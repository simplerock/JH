// Enkel service worker: gör appen installerbar, visar en offlinesida och sparar appens filer.
// Inloggad data cachas inte, den ska alltid vara färsk.
const CACHE = "homehub-v2";
const STATIC = "homehub-static-v1";
const OFFLINE = "/offline.html";
// Gamla versioners filer rensas när det blir fler än så här.
const MAX_STATIC = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== STATIC).map((k) => caches.delete(k)))),
      // Sidan börjar hämtas samtidigt som service workern startar, i stället för efter.
      self.registration.navigationPreload?.enable(),
    ])
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(request));
        } catch {
          return caches.match(OFFLINE);
        }
      })()
    );
    return;
  }
  // Appens JavaScript och CSS har versionsnummer i namnet och ändras aldrig. Sparade filer används direkt.
  const url = new URL(request.url);
  if (request.method === "GET" && url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) {
          event.waitUntil(
            cache.put(request, res.clone()).then(async () => {
              const keys = await cache.keys();
              await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC)).map((k) => cache.delete(k)));
            })
          );
        }
        return res;
      })
    );
  }
});
