const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execFileSync } = require("child_process");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "public/school-workspace.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public/school-workspace.css"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
assert.match(html, /school-workspace\.js/);
assert.match(html, /school-workspace\.css/);
for (const section of ["overview","learners","teachers","classes","lessons","assessments","analytics","attendance","timetable","community","records","settings"]) {
  assert.ok(js.includes('moduleButton("' + section + '"'), "missing school section " + section);
}
assert.match(js, /MutationObserver/);
assert.match(js, /Connected school records/);
assert.match(js, /school-lesson-form/);
assert.match(js, /Prepare lesson & assessment/);
assert.match(js, /\/api\/v1\/school\/lessons/);
assert.match(js, /Open notes, teaching steps and assessment/);
assert.match(server, /app\.get\("\/api\/v1\/school\/lessons"/);
assert.match(server, /app\.post\("\/api\/v1\/school\/lessons"/);
assert.match(server, /app\.get\("\/api\/v1\/school\/attendance"/);
assert.match(server, /app\.post\("\/api\/v1\/school\/attendance"/);
assert.match(server, /app\.get\("\/api\/v1\/school\/timetable"/);
assert.match(server, /app\.post\("\/api\/v1\/school\/timetable"/);
assert.match(js, /school-attendance-form/);
assert.match(js, /school-timetable-form/);
assert.match(js, /school-operations/);
assert.match(css, /school-attendance-row/);

assert.match(server, /Only authenticated school accounts or the project owner can prepare lessons/);
assert.match(server, /lessonEngine\.generateTeacherLesson/);
assert.match(server, /lessonEngine\.createLesson/);
assert.match(js, /No sample records are shown as real data/);
assert.match(css, /school-module-nav/);
execFileSync(process.execPath, ["--check", path.join(root, "public/school-workspace.js")], { stdio: "pipe" });
execFileSync(process.execPath, ["--check", path.join(root, "server.js")], { stdio: "pipe" });
console.log("School workspace enhancement smoke test passed.");
