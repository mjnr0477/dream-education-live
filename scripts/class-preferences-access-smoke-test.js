"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

const prefMarker = 'app.post("/api/product/learner/:learner_id/preferences", async (req, res) => {';
const prefStart = source.indexOf(prefMarker);
assert.notStrictEqual(prefStart, -1, "Preference route must exist and be async.");
const prefEnd = source.indexOf("\napp.", prefStart + prefMarker.length);
const prefBody = source.slice(prefStart, prefEnd < 0 ? source.length : prefEnd);
assert.ok(prefBody.includes("getAuthenticatedAccount(req)"), "Preference writes must authenticate.");
assert.ok(prefBody.includes('auth.account.role !== "learner"'), "Preference writes must restrict ordinary access to learners.");
assert.ok(prefBody.includes("auth.account.learner_id"), "Preference writes must enforce learner self-ownership.");
assert.ok(prefBody.includes("status(403)"), "Preference writes must reject cross-account changes.");

const classMarker = 'app.get("/api/product/class/:class_id", async (req, res) => {';
const classStart = source.indexOf(classMarker);
assert.notStrictEqual(classStart, -1, "Class read route must exist and be async.");
const classEnd = source.indexOf("\napp.", classStart + classMarker.length);
const classBody = source.slice(classStart, classEnd < 0 ? source.length : classEnd);
assert.ok(classBody.includes("getAuthenticatedAccount(req)"), "Class reads must authenticate.");
assert.ok(classBody.includes("canAccessClassRecord(auth.account, classData, store)"), "Class reads must check role/class membership.");
assert.ok(classBody.includes("status(403)"), "Class reads must reject unrelated accounts.");
assert.ok(source.includes("function canAccessClassRecord(account, classData, store)"), "Class authorization helper must exist.");
console.log("class-preferences-access-smoke-test: PASS");
