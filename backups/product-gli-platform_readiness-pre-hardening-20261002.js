"use strict";

function buildPlatformReadiness({ env = process.env, dependencies = {} } = {}) {
  const checks = [
    { name: "database", ok: Boolean(env.DATABASE_URL || dependencies.database === true) },
    { name: "authentication", ok: dependencies.authentication !== false },
    { name: "adaptive_engine", ok: dependencies.adaptive_engine !== false },
    { name: "knowledge_layer", ok: dependencies.knowledge_layer !== false },
    { name: "payments_optional", ok: true },
    { name: "owner_free_forever", ok: true }
  ];
  return {
    version: "1.0.0",
    ready: checks.every(check => check.ok),
    checks
  };
}

module.exports = { buildPlatformReadiness };
