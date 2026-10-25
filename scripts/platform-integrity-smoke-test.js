"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "server.js",
  "package.json",
  "public/index.html",
  "public/app.js",
  "public/style.css",
  "public/frontend-workspace.js",
  "public/nextgen-visual.js",
  "public/nextgen-visual.css",
  "product/gli/gli_intelligence_service.js",
  "product/gli/evidence_ledger.js",
  "product/gli/learning_outcome_evaluation.js",
  "product/gli/outcome_intelligence.js",
  "product/gli/learner_intelligence_fusion.js",
  "product/gli/knowledge_intelligence_engine.js",
  "product/gli/platform_manifest.js",
  "product/gli/production_security.js",
  "assessment_engine.js",
  "decision_engine.js",
  "adaptive_question_engine.js",
  "evidence_teaching_engine.js"
];

for (const relative of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, relative)), "Missing required project file: " + relative);
}

for (const file of [
  "server.js",
  "public/app.js",
  "product/gli/evidence_ledger.js",
  "product/gli/learning_outcome_evaluation.js",
  "product/gli/outcome_intelligence.js",
  "product/gli/learner_intelligence_fusion.js"
]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, "Syntax check failed: " + file + "\n" + result.stderr);
}

const serviceWorker = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
assert.ok(serviceWorker.includes('url.pathname.startsWith("/api/")'), "Service worker must never cache API responses.");
assert.ok(serviceWorker.includes('request.headers.has("authorization")'), "Service worker must bypass authorization-bearing requests.");
assert.ok(serviceWorker.includes("STATIC_EXTENSIONS.test(url.pathname)"), "Service worker must limit dynamic caching to static asset paths.");
assert.ok(serviceWorker.includes("private|no-store"), "Service worker must not cache private or no-store responses.");
assert.ok(serviceWorker.includes("keys => Promise.all(keys"), "Service worker must clean up obsolete Dream Education caches.");

const manifest = require(path.join(root, "product/gli/platform_manifest"));
const platform = manifest.getPlatformManifest();
assert.ok(Array.isArray(platform.protected_engines));
assert.deepStrictEqual(
  platform.protected_engines,
  [
    "assessment_engine",
    "learning_state_engine",
    "learning_profile_engine",
    "decision_engine",
    "adaptive_question_engine",
    "evidence_teaching_engine"
  ]
);

const outcome = require(path.join(root, "product/gli/outcome_intelligence"));
const outcomeSummary = outcome.buildLearningOutcomeSummary();
assert.strictEqual(outcomeSummary.status, "insufficient_outcome_evidence");

const security = require(path.join(root, "product/gli/production_security"));
assert.strictEqual(typeof security.rateLimit, "function");
assert.strictEqual(typeof security.requestId, "function");
assert.strictEqual(typeof security.validateBodySize, "function");

const requestIdMiddleware = security.requestId;
const request = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
const responseHeaders = {};
const response = { setHeader(name, value) { responseHeaders[name] = value; } };
let nextCalled = false;
requestIdMiddleware(request, response, () => { nextCalled = true; });
assert.strictEqual(nextCalled, true);
assert.ok(request.request_id);
assert.strictEqual(responseHeaders["X-Request-Id"], request.request_id);

let rejected = false;
const oversizedResponse = {
  status(code) {
    assert.strictEqual(code, 413);
    return { json(payload) {
      rejected = payload && payload.success === false;
    }};
  }
};
security.validateBodySize(10)(
  { headers: { "content-length": "11" } },
  oversizedResponse,
  () => { throw new Error("Oversized request was not rejected"); }
);
assert.strictEqual(rejected, true);

console.log("Platform integrity guardrails smoke test passed.");
