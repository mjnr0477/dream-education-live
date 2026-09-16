const {
  routeFreeSources
} = require("./free_source_router.js");

const {
  getPolicy,
  classifyFailure
} = require("./source_execution_policy.js");

const {
  queryFreeSource
} = require("./free_source_gateway.js");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryWithPolicy(sourceId, question, policyName) {
  const policy = getPolicy(policyName);

  let timer;

  try {
    const result = await Promise.race([
      queryFreeSource(sourceId, question),

      new Promise(resolve => {
        timer = setTimeout(() => {
          resolve({
            success: false,
            source: sourceId,
            data: null,
            error: "Request timeout",
            timed_out: true
          });
        }, policy.timeoutMs);
      })
    ]);

    if (timer) clearTimeout(timer);

    if (
      result &&
      result.success === true &&
      result.data != null
    ) {
      return {
        ...result,
        execution_status: "SUCCESS",
        policy: policyName
      };
    }

    const failure = classifyFailure(
      new Error(result?.error || "Source returned no usable data")
    );

    return {
      ...result,
      success: false,
      execution_status: failure.status,
      failure_reason: failure.reason,
      policy: policyName
    };
  } catch (error) {
    if (timer) clearTimeout(timer);

    const failure = classifyFailure(error);

    return {
      success: false,
      source: sourceId,
      data: null,
      error: failure.error,
      execution_status: failure.status,
      failure_reason: failure.reason,
      policy: policyName
    };
  }
}

async function coordinateFreeSources({
  domain,
  problemType = "",
  question,
  policy = "STANDARD",
  maxSources = 5,
  delayBetweenSourcesMs = 0
}) {
  if (
    typeof domain !== "string" ||
    !domain.trim() ||
    typeof question !== "string" ||
    !question.trim()
  ) {
    return {
      success: false,
      status: "INCONCLUSIVE",
      domain: domain || null,
      question: question || null,
      sources_attempted: [],
      successful_sources: [],
      results: [],
      error: "Domain and question are required."
    };
  }

  let sourceIds;

  try {
      const routed = routeFreeSources({
        domain,
        problemType,
        question
      });

      sourceIds = Array.isArray(routed?.selected_sources)
        ? routed.selected_sources
            .map(source => typeof source === "string" ? source : source?.id)
            .filter(Boolean)
        : [];
  } catch (error) {
    return {
      success: false,
      status: "INCONCLUSIVE",
      domain,
      question,
      sources_attempted: [],
      successful_sources: [],
      results: [],
      error: error?.message || "Free-source routing failed."
    };
  }

  sourceIds = Array.isArray(sourceIds)
    ? sourceIds.slice(0, maxSources)
    : [];

  const results = [];
  const successfulSources = [];

  for (const sourceId of sourceIds) {
    if (delayBetweenSourcesMs > 0) {
      await sleep(delayBetweenSourcesMs);
    }

    const result = await queryWithPolicy(
      sourceId,
      question,
      policy
    );

    results.push(result);

    if (
      result.execution_status === "SUCCESS" &&
      result.success === true
    ) {
      successfulSources.push(sourceId);
    }
  }

  return {
    success: successfulSources.length > 0,
    status:
      successfulSources.length > 0
        ? "SUCCESS"
        : "INCONCLUSIVE",
    domain,
    question,
    sources_attempted: sourceIds,
    successful_sources: successfulSources,
    results,
    error:
      successfulSources.length > 0
        ? null
        : "No selected free source returned usable data."
  };
}

module.exports = {
  coordinateFreeSources,
  queryWithPolicy
};
