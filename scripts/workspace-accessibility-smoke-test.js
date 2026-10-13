"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const workspaces = [
  ["chat", "public/chat-workspace.css"],
  ["parent", "public/parent-workspace.css"],
  ["school", "public/school-workspace.css"],
  ["teacher", "public/teacher-workspace.css"]
];

for (const [name, relativePath] of workspaces) {
  const css = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.match(css, /:focus-visible/, name + " workspace must provide visible keyboard focus.");
  assert.match(css, /prefers-reduced-motion\\s*:\\s*reduce/, name + " workspace must respect reduced-motion preferences.");
  assert.match(css, /@media\\s*\\(max-width:/, name + " workspace must include responsive mobile styling.");
}

console.log("Workspace accessibility smoke test passed.");
