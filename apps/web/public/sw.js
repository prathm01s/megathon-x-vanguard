const CACHE_NAME = "toss-life-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/en/mindset",
  "/te/mindset",
  "/en/persona",
  "/te/persona",
  "/en/ladder",
  "/te/ladder",
  "/en/play",
  "/te/play",
  "/en/report",
  "/te/report",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url);
            if (res && res.status === 200) {
              await cache.put(url, res);
            }
          } catch {
            // Silently ignore if offline during install
          }
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Cache successful responses for static assets and page navigations
          if (
            response &&
            response.status === 200 &&
            (event.request.url.includes("/_next/") ||
              event.request.url.includes("/icon.") ||
              event.request.mode === "navigate")
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(async () => {
          // If offline and request is HTML navigation, fallback to exact match or root
          if (event.request.mode === "navigate") {
            const matched = await caches.match(event.request);
            if (matched) return matched;
            return caches.match("/");
          }
        });
    }),
  );
});
