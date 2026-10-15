"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const ui = fs.readFileSync(path.join(root, "public/chat-workspace.js"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const name of ["renderGroupMessages", "renderMessages"]) {
  const start = ui.indexOf("function " + name + "(messages)");
  assert.ok(start >= 0, name + " should exist.");
  const end = ui.indexOf("\n  }", start);
  const body = ui.slice(start, end);
  assert.match(body, /wasNearBottom/, name + " should detect whether the reader is near the bottom.");
  assert.match(body, /previousScrollTop/, name + " should preserve scroll position while reading older messages.");
  assert.match(body, /if \(wasNearBottom\) box\.scrollTop = box\.scrollHeight/, name + " should auto-follow only when already near the bottom.");
}
assert.match(ui, /document\.visibilityState === "hidden"/, "Chat polling must pause while the app tab is hidden.");
assert.match(pkg.scripts.test, /chat-reading-experience-smoke-test\.js/, "Chat UX test must run in npm test.");
execFileSync(process.execPath, ["--check", path.join(root, "public/chat-workspace.js")]);
console.log("Chat reading experience smoke test passed.");
