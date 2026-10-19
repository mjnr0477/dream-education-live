"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const schoolScript = fs.readFileSync(path.join(root, "public/school-workspace.js"), "utf8");
assert.match(schoolScript, /school-workspace\.css\?v=20261013b/, "school workspace loader must use the current cache-busting version.");

const workspaces = [
  ["chat", "public/chat-workspace.css"],
  ["parent", "public/parent-workspace.css"],
  ["school", "public/school-workspace.css"],
  ["teacher", "public/teacher-workspace.css"]
];

for (const [name, relativePath] of workspaces) {
  const css = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.match(css, /:focus-visible/, name + " workspace must provide visible keyboard focus.");
  if (name === "school") {
    assert.match(css, /\.school-module-panel\s+:is\(button,input,textarea,select,\[tabindex\]\):focus-visible/, "school keyboard focus must target actual module panels.");
    assert.match(css, /\.school-space-enhanced\s+\*,\s*\.school-space-enhanced\s+\*::before,\s*\.school-space-enhanced\s+\*::after/, "school reduced-motion selectors must target the actual enhanced workspace wrapper.");
    assert.match(css, /\.school-module-nav\s+:is\(button,input,textarea,select,\[tabindex\]\):focus-visible/, "school keyboard focus must target actual module navigation.");
  }
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/, name + " workspace must respect reduced-motion preferences.");
  assert.match(css, /@media\s*\(max-width:/, name + " workspace must include responsive mobile styling.");
}

const landingCss = fs.readFileSync(path.join(root, "public/style.css"), "utf8");
assert.match(landingCss, /@media\s*\(min-width:\s*651px\)\s*and\s*\(max-width:\s*900px\)/, "tablet widths must have an explicit responsive navigation layout.");
assert.match(landingCss, /body\.menu-open\s+\.mobile-drawer/, "tablet navigation drawer must have an open state.");
assert.match(landingCss, /:where\(button, a, input, textarea, select, summary, \[tabindex\]\):focus-visible/, "site-wide keyboard focus must be visible.");
assert.match(landingCss, /prefers-reduced-motion:\s*reduce/, "the whole application must honor reduced-motion preferences.");

console.log("Workspace accessibility smoke test passed.");
