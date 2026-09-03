// Service worker for Clawford — enables offline use as an installed PWA.
// Cache-first for the static app shell, with background revalidation so
// updates are picked up on the next load without breaking offline access.
//
// CACHE_VERSION is stamped by deploy.sh with a hash of the app-shell file
// contents, so the cache name changes automatically whenever a shipped file
// changes — no manual bump needed. The placeholder below is only used for
// local/dev serving (npx serve, opening index.html directly, etc).

const CACHE_VERSION = "clawford-dev";

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "css/print.css",
  "js/app.js",
  "js/audio/player.js",
  "js/audio/synth.js",
  "js/chords.js",
  "js/fretboard-renderer.js",
  "js/instruments.js",
  "js/mapping.js",
  "js/notation-renderer.js",
  "js/pitch.js",
  "js/playback-interactions.js",
  "js/scales.js",
  "js/state.js",
  "js/storage.js",
  "js/tunings.js",
  "img/clawford-16.png",
  "img/clawford-32.png",
  "img/clawford-112.png",
  "img/clawford-180.png",
  "img/clawford-192.png",
  "img/clawford-512.png",
  "img/clawford-512-maskable.png",
  "favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
