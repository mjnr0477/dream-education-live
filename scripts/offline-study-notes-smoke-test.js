"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const workspace = fs.readFileSync(path.join(root, "public", "frontend-workspace.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "public", "service-worker.js"), "utf8");
const style = fs.readFileSync(path.join(root, "public", "style.css"), "utf8");

assert.ok(workspace.includes('const OFFLINE_NOTES_DATABASE = "dream-education-offline-notes-v1"'), "Offline notes must use a dedicated local database.");
assert.ok(workspace.includes('createIndex("learner_id", "learner_id"'), "Saved notes must be partitioned by learner account.");
assert.ok(workspace.includes("MAX_OFFLINE_NOTES_PER_LEARNER = 25"), "Offline note storage must have a per-learner bound.");
assert.ok(workspace.includes("MAX_OFFLINE_NOTE_CHARACTERS = 80000"), "Oversized notes must be rejected before storage.");
assert.ok(workspace.includes("function saveOfflineStudyNote") && workspace.includes("store.add(record)"), "Learners must explicitly save generated notes to the device.");
assert.ok(workspace.includes("function listOfflineStudyNotes") && workspace.includes('index("learner_id").getAll(String(learnerId))'), "Learners must be able to retrieve only their own saved notes.");
assert.ok(workspace.includes("function deleteOfflineStudyNote") && workspace.includes("record.learner_id === String(learnerId)"), "Delete must verify the learner owner before removing a note.");
assert.ok(workspace.includes('id="de-notes-save-offline"') && workspace.includes('id="de-offline-notes-open"'), "Notes UI must expose save and reopen controls.");
assert.ok(workspace.includes("Saved offline ✓") && workspace.includes("not encrypted") && workspace.includes("not synced"), "The interface must clearly explain local-only and unencrypted storage.");
assert.ok(workspace.includes("formatOfflineStudyNote"), "Saved notes must be rendered using escaped text.");
assert.ok(style.includes(".de-offline-notes-list") && style.includes(".de-offline-notes-item"), "The local notes library must have readable responsive styling.");
assert.ok(index.includes("/frontend-workspace.js?v=20261111c"), "The new workspace script version must be referenced by the app.");
assert.ok(worker.includes("/frontend-workspace.js?v=20261111c"), "The offline shell must precache the updated workspace script.");
console.log("Offline study notes smoke test passed.");
