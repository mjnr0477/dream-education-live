"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const worker = read("public/service-worker.js");
const register = read("public/offline-support.js");
const html = read("public/index.html");
const offline = read("public/offline.html");
const manifest = JSON.parse(read("public/manifest.webmanifest"));
const shellMatch = worker.match(/const SHELL_URLS = (\[[\s\S]*?\]);/);
assert.ok(shellMatch, "service worker should define an explicit app-shell cache list");
const shellUrls = JSON.parse(shellMatch[1]);
const localAssets = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:css|js)(?:\?[^\"]*)?)"/g)].map((match) => match[1]);
for (const asset of localAssets) {
  assert.ok(shellUrls.includes(asset), "app-shell asset must be cached for offline use: " + asset);
}

// Cache.addAll is atomic: one missing URL can prevent the entire new service
// worker from installing. Verify every precache URL maps to a real public file.
for (const assetUrl of shellUrls) {
  const pathname = assetUrl.split("?")[0];
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const filePath = path.join(__dirname, "..", "public", relativePath);
  assert.ok(fs.existsSync(filePath), "precache asset must exist before deployment: " + assetUrl);
}

assert.match(worker, /addAll\(SHELL_URLS\)/, "public app shell should be precached");
assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/, "API routes must bypass caching");
assert.match(worker, /request\.mode === "navigate"/, "navigation should have an offline fallback");
assert.doesNotMatch(worker, /cache\.put\(["']\/["'],\s*copy\)/, "navigation responses must never overwrite the public root shell cache");
assert.match(worker, /caches\.match\("\/offline\.html"\)/, "offline fallback page should be available");
assert.match(register, /register\("\/service-worker\.js"\)/, "service worker must be registered");
assert.match(register, /addEventListener\("offline"/, "offline state should be announced");
assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/, "manifest should be linked");
assert.match(html, /offline-support\.js/, "registration script should be loaded");
assert.match(offline, /need an internet connection/i, "offline limitations should be explained honestly");
assert.equal(manifest.start_url, "/", "manifest should start at the app root");
assert.equal(manifest.display, "standalone", "manifest should support standalone install mode");
console.log("Offline shell smoke test passed.");
