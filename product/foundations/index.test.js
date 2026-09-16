"use strict";

const assert = require("assert");

const core = require("./index");
const ai = require("./ai_gateway");
const data = require("./learning_data");
const outcomes = require("./outcomes");
const curriculum = require("./curriculum");
const verification = require("./verification");
const organization = require("./organization");
const revenue = require("./revenue");
const distribution = require("./distribution");

assert.strictEqual(Object.keys(core.foundations).length, 12);
assert.strictEqual(core.capabilities.international, true);
assert.strictEqual(core.capabilities.provider_replaceable, true);

const event = data.createLearningEvent({
  learner_id: "test",
  subject: "Mathematics",
  topic: "Algebra"
});
assert.ok(event.event_id);

const outcome = outcomes.recordOutcome({
  learner_id: "test",
  baseline: 40,
  current: 70
});
assert.strictEqual(outcome.improvement, 30);

const context = curriculum.createCurriculumContext({
  country: "KE",
  curriculum: "national",
  subject: "Mathematics"
});
assert.strictEqual(context.subject, "Mathematics");

const check = verification.createVerificationRecord({
  verified: true,
  method: "crosscheck"
});
assert.strictEqual(check.status, "PASS");

assert.strictEqual(
  organization.createOrganizationContext({ role: "teacher" }).role,
  "teacher"
);

assert.strictEqual(
  revenue.createAccountPlan({ owner_exempt: true }).owner_exempt,
  true
);

assert.strictEqual(
  distribution.createDistributionContext({ channel: "mobile" }).channel,
  "mobile"
);

assert.deepStrictEqual(ai.listProviders(), []);

console.log("FOUNDATIONS TEST: PASS");
console.log("FOUNDATIONS COUNT: " + Object.keys(core.foundations).length);
console.log("AI GATEWAY: READY");
console.log("INTERNATIONAL ARCHITECTURE: READY");
