"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const serverPath = path.join(root, "server.js");
const uiPath = path.join(root, "public", "chat-workspace.js");
const indexPath = path.join(root, "public", "index.html");
const cssPath = path.join(root, "public", "chat-workspace.css");
const server = fs.readFileSync(serverPath, "utf8");
const ui = fs.readFileSync(uiPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

for (const route of [
  'app.get("/api/chat/groups"',
  'app.post("/api/chat/groups"',
  'app.get("/api/chat/groups/:group_id/messages"',
  'app.post("/api/chat/groups/:group_id/messages"',
  'app.post("/api/chat/groups/:group_id/members"',
  'app.post("/api/chat/groups/:group_id/leave"'
]) assert.ok(server.includes(route), "Missing group chat route: " + route);

assert.match(server, /chatGroupMember\(group, account\.role, chatEntityId\(account\)\)/);
assert.match(server, /You can only invite people connected to your account/);
assert.match(server, /Only group owners and admins can add members/);
assert.match(server, /Messages must contain 1–4000 characters/);
assert.match(server, /group\.members\.length >= 50/);
assert.match(server, /group\.members\[0\]\.group_role = "owner"/);
assert.match(server, /store\.chat_groups\[group\.group_id\] = group/);
assert.match(server, /group\.messages\.push\(message\)/);

for (const feature of [
  'de-chat-create-group',
  'de-chat-groups',
  'de-chat-add-member',
  'de-chat-leave-group',
  '/api/chat/groups',
  'loadGroupMessages',
  'renderGroupMessages'
]) assert.ok(ui.includes(feature), "Missing group chat UI feature: " + feature);

assert.match(ui, /selectedGroup/);
assert.match(ui, /setInterval\(function \(\)/);
assert.match(ui, /new AbortController\(\)/, "Chat API requests must have an abortable timeout.");
assert.match(ui, /window\.setTimeout\(function \(\) \{ controller\.abort\(\); \}, 15000\)/, "Chat API requests must time out instead of hanging indefinitely.");
assert.match(ui, /let pollInFlight = false;/, "Chat polling must track in-flight requests.");
assert.match(ui, /document\.visibilityState === "hidden" \|\| pollInFlight/, "Chat must avoid overlapping background polls.");
assert.match(ui, /finally\(function \(\) \{ pollInFlight = false; \}\)/, "Chat polling lock must be released after success or failure.");
assert.match(ui, /textContent = message\.content/);
assert.match(css, /de-chat-group-heading/);
assert.match(ui, /data-panel-action="media-studio"/, "Chat should provide a direct Media Studio shortcut.");
assert.match(ui, /data-panel-action="meetings"/, "Chat should provide a direct Meetings shortcut.");
assert.match(css, /de-chat-quick-actions/, "Chat learning shortcuts must be styled responsively.");
assert.match(index, /chat-workspace\.js\?v=20261013a/);

execFileSync(process.execPath, ["--check", serverPath]);
execFileSync(process.execPath, ["--check", uiPath]);

console.log("Group chat smoke test passed.");
