"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "public/service-worker.js"), "utf8");

function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.notEqual(start, -1, "expected auth handler marker: " + startMarker);
  assert.notEqual(end, -1, "expected next auth handler marker: " + endMarker);
  return app.slice(start, end);
}

const login = section("async function submitLogin(form) {", "async function submitRegister(form) {");
const register = section("async function submitRegister(form) {", 'document.addEventListener("submit"');

for (const [name, handler, endpoint] of [
  ["login", login, "/api/auth/login"],
  ["registration", register, "/api/auth/register"]
]) {
  assert.ok(handler.includes('fetchWithTimeout("' + endpoint + '"'),
    name + " must use the bounded shared request helper");
  assert.match(handler, /\},\s*75000\s*\)/,
    name + " must use the 75-second cold-start-aware limit");
  assert.match(handler, /error\s*&&\s*error\.name\s*===\s*["']AbortError["']/,
    name + " must present a specific timeout message");
  assert.match(handler, /setFormBusy\(form,\s*false\)/,
    name + " must restore its submit button after failure");
  assert.doesNotMatch(handler, /clearAuth\(/,
    name + " timeout must not discard a saved user session");
}

assert.match(index, /\/app\.js\?v=20261111c/,
  "HTML must reference the refreshed app bundle");
assert.match(serviceWorker, /dream-education-shell-v12/,
  "offline shell cache must be versioned for the updated app");
assert.match(serviceWorker, /\/app\.js\?v=20261111c/,
  "offline shell must precache the refreshed app bundle");

console.log("Authentication form timeout smoke test passed.");
