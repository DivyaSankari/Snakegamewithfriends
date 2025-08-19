
const CACHE_NAME = "friends-snake-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./manifest.webmanifest",
  "./audio/bgm_loop.wav",
  "./assets/obstacle_couch.png",
  "./assets/power_coffee.png",
  "./assets/power_turkey.png",
  "./assets/power_frame.png",
  "./assets/boost_pad.png",
  // icons
  "./icons/icon-512x512.png",
  "./icons/icon-192x192.png",
  "./icons/icon-180x180.png",
  "./icons/icon-152x152.png",
  "./icons/icon-144x144.png",
  "./icons/icon-128x128.png",
  "./icons/icon-96x96.png",
  "./icons/icon-72x72.png",
  "./icons/icon-48x48.png",
  "./icons/icon-36x36.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((resp) => {
        // Optionally cache new GET requests
        if (e.request.method === "GET") {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, respClone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
