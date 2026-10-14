"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
new vm.Script(source, { filename: "public/app.js" });

const start = source.indexOf("function teacherAnalyticsMarkup(data) {");
const end = source.indexOf("async function openParentChildOverview", start);
assert.notEqual(start, -1, "Teacher analytics renderer must exist.");
assert.ok(end > start, "Teacher analytics renderer must have an end boundary.");
const renderer = source.slice(start, end);
const sandbox = {};
vm.runInNewContext(renderer +
  "\nthis.emptyHtml = teacherAnalyticsMarkup({ analysis: {}, results: [], by_subject: [], by_topic: [] });" +
  "\nthis.progressHtml = teacherAnalyticsMarkup({ analysis: { total_results: 2, average_score: 60, weak_results: 1, learners_needing_support: 1 }, by_subject: [], by_topic: [], results: [" +
  "{ learner_id: 'learner-1', learner_name: 'Amina', topic: 'Fractions', score: 50, created_at: '2026-10-01T10:00:00Z' }," +
  "{ learner_id: 'learner-1', learner_name: 'Amina', topic: 'Fractions', score: 70, created_at: '2026-10-08T10:00:00Z' }" +
  "] });", sandbox);

assert.match(sandbox.emptyHtml, /Average score[\s\S]*?Not yet available/);
assert.match(sandbox.emptyHtml, /Not enough dated repeated results/);
assert.match(sandbox.progressHtml, /Observed progress over time/);
assert.match(sandbox.progressHtml, /Amina/);
assert.match(sandbox.progressHtml, /\+20 points/);
assert.match(sandbox.progressHtml, /descriptive and do not prove causation/);
assert.match(index, /app\.js\?v=\d{8}[a-z]*/);

console.log("Teacher progress evidence smoke test passed.");
