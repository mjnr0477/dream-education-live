const fs = require("fs");
const assert = require("assert");

const index = fs.readFileSync("public/index.html", "utf8");
const workspace = fs.readFileSync("public/frontend-workspace.js", "utf8");
const css = fs.readFileSync("public/style.css", "utf8");

assert(index.includes("/frontend-workspace.js?v=20261001"));
assert(workspace.includes('"/api/intelligence/"'));
assert(workspace.includes('"/api/v1/role/"'));
assert(workspace.includes('"/api/progress/"'));
assert(workspace.includes('"/api/v1/learner/"'));
assert(workspace.includes("data-de-workspace"));
assert(workspace.includes("escapeHTML"));
assert(css.includes(".de-workspace"));
assert(css.includes("@media (prefers-reduced-motion: reduce)"));

if (/api[_-]?key\s*[:=]\s*["'][^"']+["']/i.test(workspace)) {
  throw new Error("Frontend workspace appears to contain a hard-coded API key.");
}

console.log("Frontend workspace smoke test passed.");
