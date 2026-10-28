"use strict";

const CACHE_VERSION = "dream-education-shell-v1";
const SHELL_URLS = [
  "/", "/index.html", "/offline.html", "/manifest.webmanifest",
  "/style.css?v=20261025b", "/books-reading.css?v=20261018a",
  "/teacher-workspace.css?v=20261012a", "/meetings-workspace.css?v=20261012a",
  "/dream-search.css?v=20261011d", "/nextgen-visual.css?v=20261011a",
  "/school-workspace.css?v=20261015a", "/parent-workspace.css?v=20261013b",
  "/chat-workspace.css?v=20261015a", "/media-studio.css?v=20261013b",
  "/dream-invest.css?v=20261014c", "/dream-invest-betting.css?v=20261014b",
  "/visual-refresh.css?v=20261026a", "/visual-refresh-workspaces.css?v=20261026a",
  "/landing-premium.css?v=20261026g",
  "/offline-support.js?v=20261027a", "/app.js?v=20261025b",
  "/books-reading.js?v=20261018a", "/dream-search.js?v=20261011b",
  "/frontend-workspace.js?v=20261025c", "/nextgen-visual.js?v=20261011a",
  "/school-workspace.js?v=20261022a", "/parent-workspace.js?v=20261012a",
  "/chat-workspace.js?v=20261022c", "/media-studio.js?v=20261013b",
  "/dream-invest.js?v=20261015e", "/dream-invest-betting-ui.js?v=20261014j"
];

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
        // Keep the root cache entry bound to the precached public shell.
        // Never replace it with an arbitrary navigation response, which may
        // contain personalized HTML from a route not yet classified as private.
        return response;
      }).catch(async () => (await caches.match(request)) || (await caches.match("/")) || (await caches.match("/offline.html")))
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
