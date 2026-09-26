"use strict";

const core = require("./orchestrator");
const directions = require("./direction_engine");
const portfolio = require("./portfolio_engine");
const transfer = require("./transfer_engine");
const change = require("./change_engine");

function capabilityGraph(identity) {
  const capabilities = Object.values(identity.capabilities || {});
  const nodes = capabilities.map((capability) => ({
    id: capability.id,
    name: capability.name,
    state: capability.state,
    confidence: capability.confidence,
    evidence_count: capability.evidence_ids?.length || 0
  }));

  const edges = [];

  for (const goal of identity.goals || []) {
    for (const required of goal.desired_capabilities || []) {
      const capabilityId =
        typeof required === "object"
          ? required.id || required.capability_id
          : required;

      if (!capabilityId) continue;

      edges.push({
        from: capabilityId,
        to: `goal:${goal.id}`,
        type: "supports_goal",
        goal_id: goal.id
      });
    }
  }

  for (const gap of identity.gaps || []) {
    edges.push({
      from: gap.capability_id,
      to: `gap:${gap.goal_id}:${gap.capability_id}`,
      type: "capability_gap",
      goal_id: gap.goal_id
    });
  }

  return { nodes, edges };
}

function buildDevelopmentSnapshot(identity, options = {}) {
  const ensured = identity && identity.identity
    ? identity
    : core.ensureIdentity(identity, identity?.identity || {});

  const graph = capabilityGraph(ensured);
  const passport = ensured ? require("./passport_engine").buildPassport(ensured) : null;
  const portfolioView = portfolio.buildPortfolio(ensured);

  const possibleDirections = directions.generateDirections(
    ensured,
    options.directions || []
  );

  const transfers = transfer.suggestTransfers(
    ensured,
    options.transfers || []
  );

  return {
    identity: ensured.identity,
    goals: ensured.goals,
    capabilities: Object.values(ensured.capabilities || {}),
    capability_graph: graph,
    gaps: ensured.gaps,
    projects: ensured.projects,
    milestones: ensured.milestones,
    evidence: ensured.evidence,
    passport,
    portfolio: portfolioView,
    discovery: require("./discovery_engine").discoverySummary(ensured),
    directions: possibleDirections,
    transfers,
    next_actions: ensured.next_actions,
    journey: ensured.journeys?.[0] || null,
    change: change.snapshot(ensured),
    generated_at: new Date().toISOString()
  };
}

function createGoal(identity, input) {
  const goal = core.createGoal(identity, input);
  core.ingestEvidence(identity, {
    type: "reflection",
    title: `Goal created — ${goal.title}`,
    description: goal.description,
    source: "dream_goal",
    goal_ids: [goal.id],
    confidence: 0.5
  });
  return goal;
}

module.exports = {
  capabilityGraph,
  buildDevelopmentSnapshot,
  createGoal
};
