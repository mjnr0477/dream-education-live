"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const workspace = fs.readFileSync(path.join(root, "public/frontend-workspace.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

assert.match(workspace, /setTimeout\(function \(\) \{\s*controller\.abort\(\);\s*\}, 8000\)/);
assert.match(workspace, /Learning request timed out after 8 seconds/);
assert.match(index, /frontend-workspace\.js\?v=20261025c/);
console.log("Learner workspace timeout smoke test passed.");
