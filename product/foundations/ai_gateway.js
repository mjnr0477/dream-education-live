"use strict";

/*
 * Low-cost AI gateway.
 *
 * Priority:
 * 1. Existing deterministic/internal specialist
 * 2. Cached verified result
 * 3. Configured low-cost/local AI provider
 * 4. Stronger AI provider only when necessary
 *
 * Providers are intentionally adapters so Dream Education
 * is not permanently locked to one AI company.
 */

const providers = new Map();

function registerProvider(name, provider) {
  if (!name || !provider || typeof provider.generate !== "function") {
    throw new Error("Invalid AI provider");
  }
  providers.set(name, provider);
}

function listProviders() {
  return Array.from(providers.keys());
}

async function generate(request = {}) {
  const preferred = request.provider || process.env.AI_PROVIDER;

  if (preferred && providers.has(preferred)) {
    return providers.get(preferred).generate(request);
  }

  for (const [name, provider] of providers) {
    if (typeof provider.available === "function" && !provider.available(request)) {
      continue;
    }
    return provider.generate({ ...request, provider: name });
  }

  return {
    success: false,
    provider: null,
    reason: "No AI provider configured"
  };
}

module.exports = {
  registerProvider,
  listProviders,
  generate
};
