"use strict";

const registry = require("./ai_router");

const { generateOpenRouter } = require("./providers/openrouter");
const { generateGemini } = require("./providers/gemini");
const { generateGroq } = require("./providers/groq");
const { generateHuggingFace } = require("./providers/huggingface");
const { generateCloudflare } = require("./providers/cloudflare");
const { generateMistral } = require("./providers/mistral");
const { generateCohere } = require("./providers/cohere");

async function generateWithProvider(provider, request) {
  switch (provider.id) {
    case "openrouter_free":
      return generateOpenRouter(request);

    case "gemini":
      return generateGemini(request);

    case "groq":
      return generateGroq(request);

    case "huggingface":
      return generateHuggingFace(request);

    case "cloudflare":
      return generateCloudflare(request);

    case "mistral":
      return generateMistral(request);

    case "cohere":
      return generateCohere(request);

    default:
      return {
        success: false,
        provider: provider.id,
        status: "adapter_not_available",
        message: `No adapter installed for ${provider.id}.`
      };
  }
}

async function generateAI(request = {}) {
  const providers = registry.getProviders({
    freeOnly: true,
    configuredOnly: true
  });

  const attempts = [];

  for (const provider of providers) {
    try {
      const result = await generateWithProvider(provider, request);

      attempts.push({
        provider: provider.id,
        success: result.success === true,
        status: result.status || null,
        message: result.success ? null : result.message || null,
        retry_after: result.retry_after || null
      });

      if (result.success) {
        return {
          success: true,
          provider: result.provider,
          model: result.model || null,
          content: result.content,
          usage: result.usage || null,
          attempts
        };
      }
    } catch (error) {
      attempts.push({
        provider: provider.id,
        success: false,
        status: error.statusCode === 429 ? "rate_limited" : "router_error",
        message: error.message,
        retry_after: error.retryAfter || null
      });
    }
  }

  return {
    success: false,
    status: "all_free_providers_failed",
    message: "No configured free AI provider returned a usable response.",
    attempts
  };
}

module.exports = {
  generateAI
};
