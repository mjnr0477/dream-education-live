"use strict";

/*
 * DREAM EDUCATION — INTERNATIONAL PRODUCT FOUNDATIONS
 *
 * Additive architecture only.
 * This layer does not replace the existing learning, adaptive,
 * solver, verification, auth, dashboard, chat or payment engines.
 */

const VERSION = "1.0.0";

const foundations = {
  global_curriculum: {
    id: "global_curriculum",
    purpose: "Represent learning content across countries, curricula, levels and standards.",
    status: "foundation"
  },

  learning_intelligence: {
    id: "learning_intelligence",
    purpose: "Maintain learner state, preferences, mastery, misconceptions and learning signals.",
    status: "foundation"
  },

  outcome_measurement: {
    id: "outcome_measurement",
    purpose: "Measure learning progress, mastery, assessment performance and outcomes.",
    status: "foundation"
  },

  learning_data: {
    id: "learning_data",
    purpose: "Create structured, privacy-aware learning events and longitudinal records.",
    status: "foundation"
  },

  ai_independence: {
    id: "ai_independence",
    purpose: "Allow multiple AI providers, local models and deterministic engines behind one gateway.",
    status: "foundation"
  },

  verification: {
    id: "verification",
    purpose: "Require evidence, checking and verification before uncertain information is taught.",
    status: "foundation"
  },

  teacher_intelligence: {
    id: "teacher_intelligence",
    purpose: "Support teacher analytics, intervention signals, lesson support and learner insights.",
    status: "foundation"
  },

  parent_intelligence: {
    id: "parent_intelligence",
    purpose: "Provide parent-facing progress, activity and support signals.",
    status: "foundation"
  },

  school_operations: {
    id: "school_operations",
    purpose: "Support classes, schools, roles, analytics, results and institutional workflows.",
    status: "foundation"
  },

  network: {
    id: "network",
    purpose: "Represent learners, teachers, parents and schools through controlled connections.",
    status: "foundation"
  },

  distribution: {
    id: "distribution",
    purpose: "Prepare international delivery through web, mobile, API, institutional and partner channels.",
    status: "foundation"
  },

  revenue: {
    id: "revenue",
    purpose: "Support sustainable subscriptions, institutional plans, usage accounting and owner exemptions.",
    status: "foundation"
  }
};

const capabilities = {
  international: true,
  multi_curriculum: true,
  multi_language_ready: true,
  multi_provider_ai: true,
  deterministic_first: true,
  verification_required: true,
  privacy_aware: true,
  provider_replaceable: true,
  existing_system_preserved: true
};

function getFoundationManifest() {
  return {
    version: VERSION,
    foundations,
    capabilities
  };
}

module.exports = {
  VERSION,
  foundations,
  capabilities,
  getFoundationManifest
};
