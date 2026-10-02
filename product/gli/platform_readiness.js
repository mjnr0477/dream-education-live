"use strict";

function resolveDependency(dependencies, env, name, envKeys = []) {
  if (Object.prototype.hasOwnProperty.call(dependencies, name)) {
    return dependencies[name] === true;
  }

  return envKeys.some(key => Boolean(env[key]));
}

function buildPlatformReadiness({ env = process.env, dependencies = {} } = {}) {
  const checks = [
    {
      name: "database",
      ok: resolveDependency(dependencies, env, "database", ["DATABASE_URL", "SUPABASE_URL"])
    },
    {
      name: "authentication",
      ok: resolveDependency(dependencies, env, "authentication")
    },
    {
      name: "adaptive_engine",
      ok: resolveDependency(dependencies, env, "adaptive_engine")
    },
    {
      name: "knowledge_layer",
      ok: resolveDependency(dependencies, env, "knowledge_layer")
    },
    { name: "payments_optional", ok: true },
    {
      name: "owner_free_forever",
      ok: resolveDependency(dependencies, env, "owner_free_forever")
    }
  ];

  return {
    version: "1.1.0",
    ready: checks.every(check => check.ok),
    checks
  };
}

module.exports = { buildPlatformReadiness };
