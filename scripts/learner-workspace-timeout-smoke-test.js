"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const workspace = fs.readFileSync(path.join(root, "public/frontend-workspace.js"), "utf8");
const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const school = fs.readFileSync(path.join(root, "public/school-workspace.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

// A free Render service may need about a minute to wake after inactivity.
// Keep the browser from aborting ordinary workspace requests before then.
assert.match(workspace, /setTimeout\(function \(\) \{\s*controller\.abort\(\);\s*\}, 75000\)/);
assert.match(workspace, /Learning request timed out after 75 seconds/);
assert.equal((app.match(/Number\(timeoutMs\) \|\| 75000/g) || []).length, 2,
  "Both shared app request helpers must allow for a free-service cold start.");
assert.match(school, /timeoutMs = 75000/,
  "School lesson requests must allow for a free-service cold start.");
assert.match(index, /app\.js\?v=20261111b/);
assert.match(index, /frontend-workspace\.js\?v=20261111c/);
assert.match(index, /school-workspace\.js\?v=20261111a/);
console.log("Learner and shared-workspace cold-start timeout smoke test passed.");
