"use strict";

const assert = require("assert");
const { buildPersonalLearningMemory } = require("../product/gli/personal_learning_memory");
const { buildProjectPortfolio } = require("../product/gli/project_portfolio_engine");

const memory = buildPersonalLearningMemory({
  learner: { learner_id: "ci", preferred_learning_method: "examples", active_topic: "fractions" },
  history: [{ subject: "Math", topic: "fractions", created_at: new Date().toISOString() }],
  profile: { overall: { strengths: ["addition"], gaps: ["fractions"] } }
});
assert.strictEqual(memory.learner_id, "ci");
assert.strictEqual(memory.preferences.preferred_learning_method, "examples");
assert.strictEqual(memory.recent_learning.length, 1);

const portfolio = buildProjectPortfolio({
  learnerId: "ci",
  projects: [{ title: "Solar model", skills: ["science"], status: "complete" }]
});
assert.strictEqual(portfolio.project_count, 1);
assert.strictEqual(portfolio.projects[0].status, "complete");

console.log("GLI memory and portfolio smoke test passed");
