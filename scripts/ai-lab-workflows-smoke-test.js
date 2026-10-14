"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

new vm.Script(app, { filename: "public/app.js" });
assert.match(app, /title: "Problem solving"[\s\S]*?action: "ai-problem-solving"/);
assert.match(app, /title: "Knowledge discovery"[\s\S]*?action: "ai-knowledge-discovery"/);
assert.match(app, /data-panel-action="ai-problem-solving">Open Problem Solving/);
assert.match(app, /data-panel-action="ai-knowledge-discovery">Open Knowledge Discovery/);
assert.match(app, /if \(action === "ai-problem-solving"\)[\s\S]*?openPanel\("learn"\)/);
assert.match(app, /if \(action === "ai-knowledge-discovery"\)[\s\S]*?getElementById\("dream-search"\)/);
assert.match(index, /app\.js\?v=20261015d/);
console.log("AI Lab workflows smoke test passed.");
