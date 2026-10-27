"use strict";

const CACHE_VERSION = "dream-education-shell-v1";
const SHELL_URLS = ["/", "/index.html", "/offline.html", "/style.css", "/app.js", "/offline-support.js"];

// Only the public app shell and same-origin static assets are cached.
// Never cache API responses, authentication/session routes, or personalized data.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("dream-education-shell-") && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isPrivateOrDynamic(url) {
  return url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/signin") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/account") ||
    url.pathname.startsWith("/dashboard");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateOrDynamic(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/", copy)).catch(() => {});
        }
        return response;
      }).catch(async () => (await caches.match(request)) || (await caches.match("/")) || (await caches.match("/offline.html"))
    );
    return;
  }

  // Public static assets: prefer the network, update cache in the background,
  // and fall back to the last successfully fetched copy when offline.
  if (/\.(?:css|js|mjs|png|jpg|jpeg|webp|svg|woff2?|ttf|ico|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(async () => (await caches.match(request)) || Response.error())
    );
  }
});
