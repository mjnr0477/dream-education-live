const fs = require("fs");
const assert = require("assert");

const index = fs.readFileSync("public/index.html", "utf8");
const workspace = fs.readFileSync("public/frontend-workspace.js", "utf8");
const css = fs.readFileSync("public/style.css", "utf8");

assert(/<script[^>]+src=["\']\/frontend-workspace\.js(?:\?[^"\']*)?["\']/i.test(index), "frontend workspace script must be loaded.");
const learnerHub = workspace.slice(workspace.indexOf("async function loadLearnerWorkspace"), workspace.indexOf("function roleMetricValue"));
assert(learnerHub.includes("de-learn-hub-grid"), "Learner Learn should open with a button-first hub.");
assert(!learnerHub.includes("/api/intelligence/"), "Learn should not fetch intelligence before the learner opens a destination.");
assert(workspace.includes('"/api/v1/role/"'));
assert(workspace.includes('"/api/progress/"'));
assert(workspace.includes('"/api/v1/learner/"'));
assert(workspace.includes("data-de-workspace"));
assert(workspace.includes("window.openDreamLearningHub = openWorkspace"), "The compact Learn hub must be exposed to the landing-page dashboard entry point.");
assert(/if \(typeof window\.openDreamLearningHub === "function"\)\s*\{\s*window\.openDreamLearningHub\(\);\s*return;/.test(readApp()), "Authenticated Start learning must open the compact Learn hub instead of the legacy dashboard.");

function readApp() {
  return fs.readFileSync("public/app.js", "utf8");
}
assert(workspace.includes("escapeHTML"));
assert(css.includes(".de-workspace"));
assert(css.includes("@media (prefers-reduced-motion: reduce)"));

if (/api[_-]?key\s*[:=]\s*["'][^"']+["']/i.test(workspace)) {
  throw new Error("Frontend workspace appears to contain a hard-coded API key.");
}

console.log("Frontend workspace smoke test passed.");
