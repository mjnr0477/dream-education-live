"use strict";

const VERSION = "1.1.0";

function getPlatformManifest() {
  return {
    name: "Dream Education Global Learning Intelligence",
    version: VERSION,
    capabilities: [
      "learner_graph",
      "proactive_learning",
      "offline_event_sync",
      "school_onboarding",
      "developer_api",
      "retention_intelligence",
      "misconception_intelligence",
      "transfer_intelligence",
      "learning_method_intelligence",
      "curriculum_intelligence",
      "personal_learning_memory",
      "learning_portfolio",
      "project_portfolio",
      "platform_readiness"
    ],
    protected_engines: [
      "assessment_engine",
      "learning_state_engine",
      "learning_profile_engine",
      "decision_engine",
      "adaptive_question_engine",
      "evidence_teaching_engine"
    ]
  };
}

module.exports = { getPlatformManifest };
