"use strict";

const CACHE_PREFIX = "dream-education-";
const CACHE = "dream-education-shell-v2";
const APP_SHELL = ["/", "/index.html", "/style.css", "/app.js"];
const STATIC_EXTENSIONS = /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i;

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (request.headers.has("authorization")) return false;
  if (url.pathname.startsWith("/api/") || url.pathname === "/api") return false;
  return APP_SHELL.includes(url.pathname) || STATIC_EXTENSIONS.test(url.pathname);
}

function isCacheableResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const control = String(response.headers.get("cache-control") || "").toLowerCase();
  return !/\b(?:private|no-store)\b/.test(control) &&
    !response.headers.has("set-cookie");
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (!isCacheableStaticRequest(request, url)) return;

  event.respondWith(
    fetch(request).then(response => {
      if (isCacheableResponse(response)) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      return cached || new Response("", { status: 503, statusText: "Offline" });
    })
  );
});
