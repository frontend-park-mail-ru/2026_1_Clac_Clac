const CACHE_NAME = "clac-clac-__CACHE_VERSION__";
const API_CACHE_NAME = "clac-clac-api";

// eslint-disable-next-line no-undef
const staticAssets = __PRECACHE_MANIFEST__;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(staticAssets)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.pathname === "/api/csrf") return;

  if (url.pathname.startsWith("/api") && request.method !== "GET") {
    event.waitUntil(caches.delete(API_CACHE_NAME));
    return;
  }

  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request.clone())
            .then((response) => {
              if (response && response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => null);

          if (cached) {
            event.waitUntil(networkFetch);
            return cached;
          }
          return networkFetch.then(
            (r) =>
              r ||
              new Response(JSON.stringify({ error: "offline" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }),
          );
        }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request)),
  );
});
