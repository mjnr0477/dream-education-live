"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const engine = fs.readFileSync(path.join(root, "product/notes_study_engine.js"), "utf8");
const workspace = fs.readFileSync(path.join(root, "public/frontend-workspace.js"), "utf8");
const stylesheet = fs.readFileSync(path.join(root, "public/style.css"), "utf8");

new vm.Script(server, { filename: "server.js" });
new vm.Script(engine, { filename: "product/notes_study_engine.js" });
new vm.Script(workspace, { filename: "public/frontend-workspace.js" });

assert.match(server, /app\.post\("\/api\/v1\/learning\/notes"/);
assert.match(server, /generateStudyNotes/);
assert.match(engine, /retrieveKnowledgeIntelligence/);
assert.match(engine, /generateAI/);
assert.match(engine, /evidence_status: "retrieved"/);
assert.match(workspace, /data-de-action="notes"/);
assert.match(workspace, /function openStudyNotes\(/);
assert.match(workspace, /\/api\/v1\/learning\/notes/);
assert.match(workspace, /Notes &amp; Study Materials/);
assert.match(workspace, /de-notes-copy/);
assert.match(workspace, /de-notes-print/);
assert.match(stylesheet, /Notes & Study Materials/);

console.log("Notes & Study Materials smoke test passed.");
