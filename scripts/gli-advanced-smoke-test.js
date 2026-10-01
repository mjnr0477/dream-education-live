"use strict";

const assert = require("assert");
const { buildAdvancedLearnerIntelligence } = require("../product/gli/advanced_learner_intelligence");
const { selectLearningMethod } = require("../product/gli/learning_method_intelligence");
const { buildCurriculumIntelligence } = require("../product/gli/curriculum_intelligence");
const { buildLearningPortfolio } = require("../product/gli/learning_portfolio_engine");
const { buildPlatformReadiness } = require("../product/gli/platform_readiness");

const profile = {
  overall: { weakest_subject: "Math" },
  patterns: { current_misconception_topics: ["fractions"] },
  topics: { fractions: { current_state: "MISCONCEPTION" } }
};

const advanced = buildAdvancedLearnerIntelligence({
  profile,
  assessments: [{
    topic: "fractions",
    score: 40,
    understanding: "misconception",
    misconceptions: "Confuses numerator and denominator",
    created_at: new Date().toISOString()
  }]
});

assert.strictEqual(advanced.misconceptions.count, 1);
assert.strictEqual(advanced.next_best_action.action, "correct");
assert.strictEqual(selectLearningMethod({ misconception: true }).selected_method, "explanation");
assert.strictEqual(buildCurriculumIntelligence({ concepts: ["fractions"], profile }).nodes.length, 1);
assert.strictEqual(buildLearningPortfolio({ learner: { learner_id: "ci" }, assessments: [] }).learner_id, "ci");
assert.strictEqual(buildPlatformReadiness({ dependencies: { database: true } }).ready, true);

console.log("GLI advanced smoke test passed");
