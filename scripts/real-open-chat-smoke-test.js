"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const ui = fs.readFileSync(path.join(root, "public", "chat-workspace.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "chat-workspace.css"), "utf8");

assert.match(server, /app\.get\("\/api\/chat\/users\/search"/);
assert.match(server, /app\.post\("\/api\/chat\/messages"/);
assert.match(server, /chatAccountExists\(store, recipientRole, recipientId\)/);
assert.match(server, /chatConversationId\(account\.role, senderId, recipientRole, recipientId\)/);
assert.match(server, /app\.post\("\/api\/chat\/blocks"/);
assert.match(server, /app\.post\("\/api\/chat\/reports"/);
assert.match(server, /Messages must contain 1–4000 characters/);
assert.doesNotMatch(server.slice(server.indexOf('app.post("/api/chat/messages"'), server.indexOf('app.get("/api/progress/:learner_id"')), /activeChatConnection/);
assert.match(ui, /window\.DreamEducationChat/);
assert.match(ui, /\/api\/chat\/users\/search/);
assert.match(ui, /\/api\/chat\/messages/);
assert.match(ui, /\/api\/chat\/blocks/);
assert.match(ui, /\/api\/chat\/reports/);
assert.match(ui, /textContent/);
assert.match(css, /de-chat-workspace/);
assert.match(index, /chat-workspace\.js/);
assert.match(index, /chat-workspace\.css/);

require("node:child_process").execFileSync(process.execPath, ["--check", path.join(root, "server.js")]);
require("node:child_process").execFileSync(process.execPath, ["--check", path.join(root, "public", "chat-workspace.js")]);

console.log("Real open chat smoke test passed.");
