"use strict";

/*
 * DREAM CORE
 *
 * The long-term human-development layer of Dream Education.
 *
 * This is NOT:
 * - an AI engine
 * - a replacement adaptive engine
 * - a chatbot
 * - a grading engine
 *
 * Its responsibility is to turn evidence already produced by Dream
 * into a persistent representation of:
 *
 * person -> capability -> goal -> gap -> direction -> action -> evidence
 */

const crypto = require("crypto");

const VERSION = "1.0.0";

const GOAL_STATES = [
  "exploring",
  "active",
  "paused",
  "completed",
  "abandoned"
];

const EVIDENCE_TYPES = [
  "assessment",
  "learning_activity",
  "project",
  "exercise",
  "teacher_observation",
  "self_report",
  "milestone",
  "external_evidence"
];

const CAPABILITY_STATES = [
  "unknown",
  "emerging",
  "developing",
  "demonstrated",
  "strong",
  "mastered"
];

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function clean(value) {
  return String(value || "").trim();
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeScore(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return null;

  return Math.max(0, Math.min(100, n));
}

function capabilityState(score) {
  if (score === null) return "unknown";
  if (score < 40) return "emerging";
  if (score < 60) return "developing";
  if (score < 75) return "demonstrated";
  if (score < 90) return "strong";
  return "mastered";
}

function createDreamIdentity(learner = {}) {
  const timestamp = now();

  return {
    version: VERSION,
    created_at: timestamp,
    updated_at: timestamp,

    purpose:
      "Understand where this person is, where they want to go, what separates the two, and what meaningful action comes next.",

    identity: {
      learner_id: learner.learner_id || null,
      name: learner.name || "Learner",
      level: learner.level || null,
      grade: learner.grade || null
    },

    aspirations: [],

    goals: [],

    capabilities: {},

    gaps: [],

    directions: [],

    journeys: {},

    evidence: [],

    milestones: [],

    next_actions: [],

    reflections: [],

    signals: {
      interests: [],
      strengths: [],
      recurring_difficulties: [],
      preferred_methods: [],
      demonstrated_preferences: []
    },

    summary: {
      active_goals: 0,
      demonstrated_capabilities: 0,
      unresolved_gaps: 0,
      completed_milestones: 0,
      evidence_count: 0
    }
  };
}

function ensureDreamIdentity(learner = {}) {
  if (
    learner.dream_identity &&
    typeof learner.dream_identity === "object"
  ) {
    return learner.dream_identity;
  }

  return createDreamIdentity(learner);
}

function addEvidence(identity, input = {}) {
  const evidence = {
    evidence_id: input.evidence_id || id("evidence"),
    type: EVIDENCE_TYPES.includes(input.type)
      ? input.type
      : "learning_activity",

    subject: clean(input.subject) || null,
    topic: clean(input.topic) || null,
    capability: clean(input.capability) || null,

    score: normalizeScore(input.score),

    learning_state: clean(input.learning_state) || null,

    description: clean(input.description) || null,

    source: clean(input.source) || "dream_education",

    created_at: input.created_at || now()
  };

  identity.evidence.unshift(evidence);

  if (identity.evidence.length > 500) {
    identity.evidence = identity.evidence.slice(0, 500);
  }

  return evidence;
}

function updateCapability(identity, input = {}) {
  const name = clean(input.capability);

  if (!name) return null;

  const key = name.toLowerCase();

  const score = normalizeScore(input.score);

  const existing = identity.capabilities[key];

  const history = existing?.history || [];

  if (score !== null) {
    history.push({
      score,
      source: input.source || "dream_education",
      created_at: now()
    });
  }

  const scores = history
    .map(item => normalizeScore(item.score))
    .filter(score => score !== null);

  const average =
    scores.length > 0
      ? Math.round(
          scores.reduce((sum, value) => sum + value, 0) /
            scores.length
        )
      : score;

  const capability = {
    capability_id:
      existing?.capability_id || id("cap"),
    name,
    state: capabilityState(average),
    score: average,
    evidence_count:
      (existing?.evidence_count || 0) + 1,
    first_seen:
      existing?.first_seen || now(),
    last_updated: now(),
    history
  };

  identity.capabilities[key] = capability;

  return capability;
}

function createGoal(identity, input = {}) {
  const title = clean(input.title);

  if (!title) {
    throw new Error("Goal title is required");
  }

  const goal = {
    goal_id: id("goal"),
    title,
    description: clean(input.description) || null,
    category: clean(input.category) || "personal_development",

    state: GOAL_STATES.includes(input.state)
      ? input.state
      : "active",

    created_at: now(),
    updated_at: now(),

    target_date: input.target_date || null,

    desired_capabilities: unique(
      input.desired_capabilities
    ),

    motivation: clean(input.motivation) || null,

    progress: {
      percentage: 0,
      evidence_count: 0,
      completed_actions: 0
    }
  };

  identity.goals.unshift(goal);

  return goal;
}

function findGoal(identity, goalId) {
  return identity.goals.find(
    goal => goal.goal_id === goalId
  ) || null;
}

function analyzeGap(identity, goal) {
  if (!goal) return null;

  const gaps = [];

  for (const desired of goal.desired_capabilities || []) {
    const key = desired.toLowerCase();
    const capability = identity.capabilities[key];

    if (!capability) {
      gaps.push({
        gap_id: id("gap"),
        goal_id: goal.goal_id,
        capability: desired,
        current_state: "unknown",
        reason: "No demonstrated evidence yet.",
        priority: "high",
        created_at: now()
      });
      continue;
    }

    if (
      ["unknown", "emerging", "developing"].includes(
        capability.state
      )
    ) {
      gaps.push({
        gap_id: id("gap"),
        goal_id: goal.goal_id,
        capability: desired,
        current_state: capability.state,
        current_score: capability.score,
        reason:
          "The capability exists but has not yet reached reliable demonstration.",
        priority:
          capability.state === "unknown"
            ? "high"
            : "medium",
        created_at: now()
      });
    }
  }

  return gaps;
}

function updateGoalProgress(identity, goal) {
  const gaps = analyzeGap(identity, goal) || [];

  identity.gaps = [
    ...identity.gaps.filter(
      gap => gap.goal_id !== goal.goal_id
    ),
    ...gaps
  ];

  const desired = goal.desired_capabilities || [];

  if (desired.length === 0) {
    return goal;
  }

  const completed = desired.filter(capabilityName => {
    const capability =
      identity.capabilities[
        capabilityName.toLowerCase()
      ];

    return capability &&
      ["demonstrated", "strong", "mastered"].includes(
        capability.state
      );
  }).length;

  goal.progress.percentage = Math.round(
    (completed / desired.length) * 100
  );

  goal.updated_at = now();

  if (goal.progress.percentage >= 100) {
    goal.state = "completed";
  }

  return goal;
}

function generateNextAction(identity, goal = null) {
  if (!goal) {
    return {
      action_id: id("action"),
      type: "discover",
      title: "Discover a direction",
      reason:
        "There is no active destination yet. Explore what you want to become and what you can already do.",
      priority: "high",
      created_at: now()
    };
  }

  const gaps = identity.gaps.filter(
    gap => gap.goal_id === goal.goal_id
  );

  if (gaps.length > 0) {
    const gap = gaps[0];

    return {
      action_id: id("action"),
      type: "close_gap",
      goal_id: goal.goal_id,
      capability: gap.capability,
      title: `Develop ${gap.capability}`,
      reason: gap.reason,
      priority: gap.priority,
      created_at: now()
    };
  }

  if (goal.progress.percentage < 100) {
    return {
      action_id: id("action"),
      type: "demonstrate",
      goal_id: goal.goal_id,
      title: `Demonstrate progress toward ${goal.title}`,
      reason:
        "The required capabilities are emerging. The next step is evidence through meaningful application.",
      priority: "medium",
      created_at: now()
    };
  }

  return {
    action_id: id("action"),
    type: "extend",
    goal_id: goal.goal_id,
    title: `Extend ${goal.title}`,
    reason:
      "The current goal has been demonstrated. Explore application, depth, or a new direction.",
    priority: "medium",
    created_at: now()
  };
}

function recordLearningEvidence(learner, input = {}) {
  const identity = ensureDreamIdentity(learner);

  const evidence = addEvidence(identity, {
    ...input,
    type: input.type || "assessment"
  });

  const capabilityName =
    clean(input.capability) ||
    clean(input.topic) ||
    clean(input.subject);

  if (capabilityName) {
    updateCapability(identity, {
      capability: capabilityName,
      score: input.score,
      source: input.source || "learning_assessment"
    });
  }

  const activeGoal =
    identity.goals.find(
      goal => goal.state === "active"
    ) || null;

  if (activeGoal) {
    updateGoalProgress(identity, activeGoal);

    const nextAction =
      generateNextAction(identity, activeGoal);

    identity.next_actions = [
      nextAction,
      ...identity.next_actions.filter(
        action =>
          action.goal_id !== activeGoal.goal_id
      )
    ].slice(0, 20);
  }

  identity.summary = summarizeIdentity(identity);
  identity.updated_at = now();

  learner.dream_identity = identity;

  return {
    learner,
    identity,
    evidence
  };
}

function summarizeIdentity(identity) {
  const capabilities =
    Object.values(identity.capabilities || {});

  return {
    active_goals: identity.goals.filter(
      goal => goal.state === "active"
    ).length,

    demonstrated_capabilities:
      capabilities.filter(capability =>
        ["demonstrated", "strong", "mastered"].includes(
          capability.state
        )
      ).length,

    unresolved_gaps:
      identity.gaps.filter(
        gap => !gap.resolved_at
      ).length,

    completed_milestones:
      identity.milestones.filter(
        milestone => milestone.completed
      ).length,

    evidence_count:
      identity.evidence.length
  };
}

function getDreamView(learner) {
  const identity = ensureDreamIdentity(learner);

  identity.summary = summarizeIdentity(identity);

  const activeGoal =
    identity.goals.find(
      goal => goal.state === "active"
    ) || null;

  return {
    version: VERSION,

    person: identity.identity,

    statement:
      activeGoal
        ? `You are building toward ${activeGoal.title}.`
        : "Your next chapter has not been defined yet.",

    active_goal: activeGoal,

    capabilities: Object.values(
      identity.capabilities || {}
    ),

    gaps: identity.gaps,

    next_actions: identity.next_actions.slice(0, 5),

    milestones: identity.milestones.slice(0, 10),

    signals: identity.signals,

    summary: identity.summary,

    recent_evidence:
      identity.evidence.slice(0, 10)
  };
}

module.exports = {
  VERSION,
  GOAL_STATES,
  EVIDENCE_TYPES,
  CAPABILITY_STATES,
  createDreamIdentity,
  ensureDreamIdentity,
  addEvidence,
  updateCapability,
  createGoal,
  findGoal,
  analyzeGap,
  updateGoalProgress,
  generateNextAction,
  recordLearningEvidence,
  summarizeIdentity,
  getDreamView
};
