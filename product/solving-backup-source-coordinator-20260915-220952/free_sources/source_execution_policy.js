const TIME_POLICIES = {
  FAST: {
    timeoutMs: 15000,
    retryable: true
  },

  STANDARD: {
    timeoutMs: 60000,
    retryable: true
  },

  EXTENDED: {
    timeoutMs: 180000,
    retryable: true
  }
};

function getPolicy(name = "STANDARD") {
  return TIME_POLICIES[name] || TIME_POLICIES.STANDARD;
}

function classifyFailure(error) {
  const message = error?.message || String(error || "");

  if (/timeout|timed out|ETIMEDOUT/i.test(message)) {
    return {
      status: "INCONCLUSIVE",
      reason: "TIMEOUT",
      error: message
    };
  }

  if (/HTTP 429/i.test(message)) {
    return {
      status: "INCONCLUSIVE",
      reason: "RATE_LIMITED",
      error: message
    };
  }

  if (/HTTP 5\d\d/i.test(message)) {
    return {
      status: "INCONCLUSIVE",
      reason: "SOURCE_SERVER_ERROR",
      error: message
    };
  }

  return {
    status: "INCONCLUSIVE",
    reason: "SOURCE_UNAVAILABLE",
    error: message
  };
}

function shouldContinueAfterFailure(failure) {
  return failure?.status === "INCONCLUSIVE";
}

module.exports = {
  TIME_POLICIES,
  getPolicy,
  classifyFailure,
  shouldContinueAfterFailure
};
