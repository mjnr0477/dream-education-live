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
const securityReport = security.buildProductionSecurityPosture({
  environment: { name: "production" },
  configuration: {
    authentication: true,
    rate_limiting: true,
    request_ids: true,
    body_limits: true,
    service_role_database: true
  }
});
assert.strictEqual(securityReport.status, "ready");
assert.strictEqual(securityReport.score, 1);

console.log("Platform integrity guardrails smoke test passed.");
