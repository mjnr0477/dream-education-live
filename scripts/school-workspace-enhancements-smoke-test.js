const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execFileSync } = require("child_process");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "public/school-workspace.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public/school-workspace.css"), "utf8");
assert.match(html, /school-workspace\.js/);
assert.match(html, /school-workspace\.css/);
for (const section of ["overview","learners","teachers","classes","lessons","assessments","analytics","attendance","timetable","community","records","settings"]) {
  assert.ok(js.includes('moduleButton("' + section + '"'), "missing school section " + section);
}
assert.match(js, /MutationObserver/);
assert.match(js, /Connected school records/);
assert.match(js, /No sample records are shown as real data/);
assert.match(css, /school-module-nav/);
execFileSync(process.execPath, ["--check", path.join(root, "public/school-workspace.js")], { stdio: "pipe" });
console.log("School workspace enhancement smoke test passed.");
