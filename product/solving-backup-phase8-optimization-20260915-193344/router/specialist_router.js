"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeProblem } = require("../analyzer/problem_analyzer.js");

const REGISTRY_PATH = path.join(
  __dirname,
  "../registry/CAPABILITY_REGISTRY.json"
);

let registryCache = null;

function loadRegistry() {
  if (!registryCache) {
    registryCache = JSON.parse(
      fs.readFileSync(REGISTRY_PATH, "utf8")
    );
  }
  return registryCache;
}

function routeProblem(question, context = {}) {
  const registry = loadRegistry();
  const analysis = analyzeProblem(question, context);

  if (!analysis.analyzed || analysis.domain === "unknown") {
    return {
      routed: false,
      route_status: "UNRESOLVED",
      domain: "unknown",
      problem_type: analysis.problem_type || "unknown",
      specialist: null,
      local_solvers: [],
      optional_solvers: [],
      evidence_sources: [],
      verification_methods: [],
      analysis
    };
  }

  const domainConfig = registry.domains[analysis.domain];

  if (!domainConfig) {
    return {
      routed: false,
      route_status: "NO_REGISTRY_ENTRY",
      domain: analysis.domain,
      problem_type: analysis.problem_type,
      specialist: null,
      local_solvers: [],
      optional_solvers: [],
      evidence_sources: [],
      verification_methods: [],
      analysis
    };
  }

  return {
    routed: true,
    route_status: "READY",
    domain: analysis.domain,
    problem_type: analysis.problem_type,
    specialist: domainConfig.specialist,
    local_solvers: domainConfig.local_solvers || [],
    optional_solvers: domainConfig.optional_solvers || [],
    evidence_sources: domainConfig.evidence_sources || [],
    verification_methods: domainConfig.verification || [],
    analysis
  };
}

module.exports = {
  routeProblem,
  loadRegistry
};
