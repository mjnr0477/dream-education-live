"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
new vm.Script(app, { filename: "public/app.js" });

const aboutStart = app.indexOf("function renderAboutDream() {");
const aboutEnd = app.indexOf("\n  function openPanel(name)", aboutStart);
assert.notEqual(aboutStart, -1);
assert.ok(aboutEnd > aboutStart);
const about = app.slice(aboutStart, aboutEnd);
for (const destination of ["learn", "teacher", "school", "tools", "search", "invest"]) {
  assert.match(about, new RegExp('data-about-workspace="' + destination + '"'), "About Dream is missing the " + destination + " route.");
}
assert.match(about, /data-panel-action="subscription"/);
assert.match(app, /if \(destination === "learn"\) openPanel\("learn"\)/);
assert.match(app, /openTeacherLessonStudio\(\)/);
assert.match(app, /openSchoolDashboard\(\)/);
assert.match(app, /openPanel\("tools"\)/);
assert.match(app, /getElementById\("dream-search-input"\)/);
assert.match(app, /querySelector\("\[data-dream-invest-open\]"\)/);
assert.match(index, /app\.js\?v=20261015e/);

console.log("About Dream product tour smoke test passed.");
