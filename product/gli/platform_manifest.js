"use strict";

const VERSION = "1.0.0";

function getPlatformManifest() {
  return {
    name: "Dream Education Global Learning Intelligence",
    version: VERSION,
    capabilities: [
      "learner_graph",
      "proactive_learning",
      "offline_event_sync",
      "school_onboarding",
      "developer_api"
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
