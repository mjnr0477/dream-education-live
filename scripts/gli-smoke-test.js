"use strict";

const assert = require("assert");

for (const file of [
  "../product/gli/learner_graph_engine",
  "../product/gli/proactive_learning_engine",
  "../product/gli/offline_sync_engine",
  "../product/gli/platform_manifest",
  "../product/gli/knowledge_intelligence_engine",
  "../product/gli/credential_engine",
  "../product/gli/tenant_engine",
  "../product/gli/production_security",
  "../product/gli/tenant_access",
  "../product/gli/telemetry_engine",
  "../product/gli/developer_api"
]) require(file);

const { buildLearnerGraph } = require("../product/gli/learner_graph_engine");
const { generateProactiveActions } = require("../product/gli/proactive_learning_engine");
const { deduplicateEvents } = require("../product/gli/offline_sync_engine");
const { buildDocumentRecord } = require("../product/gli/knowledge_intelligence_engine");

const profile = {
  overall: { weakest_subject: "Math" },
  patterns: {
    current_misconception_topics: ["fractions"],
    recovered_topics: ["algebra"]
  },
  topics: { fractions: { current_state: "MISCONCEPTION" } }
};

const graph = buildLearnerGraph({ learner_id: "ci" }, profile);
assert(graph.concept_nodes.length === 1);
assert(graph.graph_type === "derived_learner_state");

const actions = generateProactiveActions({ learner: { active_subject: "Math" }, profile });
assert(actions[0].suggested_action === "correct_then_reassess");

const events = deduplicateEvents([
  { event_id: "a", learner_id: "ci", type: "assessment_completed" },
  { event_id: "a", learner_id: "ci", type: "assessment_completed" },
  { event_id: "b", learner_id: "ci", type: "learning_cycle_completed" }
]);
assert(events.length === 2);

const document = buildDocumentRecord({
  source: "ci",
  title: "Test",
  content: "A ".repeat(1000)
});
assert(document.content_hash);
assert(document.chunks.length > 1);

console.log("GLI smoke test passed");
