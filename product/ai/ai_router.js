"use strict";

const fs = require("fs");
const path = require("path");

const REGISTRY_FILE = path.join(__dirname, "ai_registry.json");

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
  } catch (error) {
    console.error("AI registry read error:", error.message);
    return {
      version: "1.0.0",
      providers: []
    };
  }
}

function hasCredential(providerId) {
  const keys = {
    existing_ai: ["AI_API_KEY"],
    gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    openrouter_free: ["OPENROUTER_API_KEY"],
    huggingface: ["HF_TOKEN", "HUGGINGFACE_API_KEY"],
    groq: ["GROQ_API_KEY"],
    cloudflare: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY"],
    mistral: ["MISTRAL_API_KEY"],
    cohere: ["COHERE_API_KEY"]
  };

  const candidates = keys[providerId] || [];

  return candidates.some(key =>
    String(process.env[key] || "").trim().length > 0
  );
}

function isFreeCapable(provider) {
  return [
    "free",
    "free_tier",
    "free_credit",
    "limited_free"
  ].includes(provider.cost);
}

function getProviders(options = {}) {
  const registry = loadRegistry();

  let providers = Array.isArray(registry.providers)
    ? registry.providers.filter(provider => provider.enabled !== false)
    : [];

  if (options.freeOnly) {
    providers = providers.filter(isFreeCapable);
  }

  if (options.configuredOnly) {
    providers = providers.filter(provider =>
      hasCredential(provider.id)
    );
  }

  return providers.sort(
    (a, b) =>
      Number(a.priority || 999) -
      Number(b.priority || 999)
  );
}

function getProvider(id) {
  return getProviders().find(
    provider => provider.id === id
  ) || null;
}

function getStatus() {
  const registry = loadRegistry();

  const providers = Array.isArray(registry.providers)
    ? registry.providers
    : [];

  return {
    success: true,
    version: registry.version,
    total_registered: providers.length,
    enabled: getProviders().length,
    configured: getProviders({
      configuredOnly: true
    }).length,
    free_capable: providers.filter(isFreeCapable).length,
    free_configured: getProviders({
      freeOnly: true,
      configuredOnly: true
    }).length,
    providers: providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      status: provider.status,
      cost: provider.cost,
      priority: provider.priority,
      enabled: provider.enabled === true,
      configured: hasCredential(provider.id)
    }))
  };
}

module.exports = {
  loadRegistry,
  getProviders,
  getProvider,
  getStatus,
  hasCredential
};
