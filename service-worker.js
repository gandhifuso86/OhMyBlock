const CACHE_NAME = "agenda-cache-v3";

const FILES_TO_CACHE = [
  "/OhMyBlock/",
  "/OhMyBlock/index.html",
  "/OhMyBlock/style.css",
  "/OhMyBlock/script.js",
  "/OhMyBlock/manifest.json",
  "/OhMyBlock/icon-192.png",
  "/OhMyBlock/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
