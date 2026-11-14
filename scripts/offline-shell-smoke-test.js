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
const localAssets = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:css|js|png|svg)(?:\?[^\"]*)?)"/g)].map((match) => match[1]);
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
assert.ok(register.includes('window.matchMedia("(max-width: 760px)")'), "mobile status notice should detect phone-sized screens");
assert.match(register, /calc\(76px \+ env\(safe-area-inset-bottom, 0px\)\)/, "mobile status notice must sit above the bottom navigation and safe area");
assert.match(register, /addEventListener\("resize", positionStatus/, "status notice position should update when the viewport rotates or resizes");
assert.ok(html.includes("/offline-support.js?v=20261111e"), "updated offline support script must bypass old browser cache");
assert.ok(worker.includes("/offline-support.js?v=20261111e") && worker.includes("dream-education-shell-v13"), "offline shell must precache the install prompt code under a fresh cache");
assert.match(register, /Saved notes: Learn → Notes & Study Materials → My offline notes/, "offline toast should tell learners where to reopen saved notes");
assert.match(offline, /Notes you explicitly saved while signed in on this device can be reopened from Learn → Notes & Study Materials → My offline notes/i, "offline page should explain how to reopen previously saved notes");
assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/, "manifest should be linked");
assert.match(html, /offline-support\.js/, "registration script should be loaded");
assert.match(offline, /need an internet connection/i, "offline limitations should be explained honestly");
assert.equal(manifest.start_url, "/", "manifest should start at the app root");
assert.equal(manifest.display, "standalone", "manifest should support standalone install mode");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "PWA manifest should declare standard install icons");
for (const [size, purpose] of [["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]]) {
  assert.ok(manifest.icons.some(icon => icon.sizes === size && String(icon.purpose || "").split(" ").includes(purpose)),
    "PWA manifest should include a " + purpose + " icon at " + size);
}
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith("/icons/"), "PWA icons must use same-origin public paths");
  assert.ok(shellUrls.includes(icon.src), "PWA icon must be precached for offline install surfaces: " + icon.src);
  assert.ok(fs.existsSync(path.join(__dirname, "..", "public", icon.src.slice(1))), "PWA icon file must exist: " + icon.src);
}
assert.ok(html.includes('rel="icon" href="/icons/favicon.svg"'), "Browser favicon should use the Dream Education brand icon");
assert.ok(html.includes('rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png"'), "Apple home-screen icon should be declared");
assert.ok(html.includes("#050b24") && manifest.theme_color === "#050b24", "Browser and PWA theme colors should match the Dream Education night palette");
assert.ok(register.includes("beforeinstallprompt") && register.includes("promptEvent.prompt()"), "Compatible browsers should expose a working native install prompt");

console.log("Offline shell smoke test passed.");
