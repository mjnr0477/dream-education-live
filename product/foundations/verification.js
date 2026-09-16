"use strict";

function createVerificationRecord(input = {}) {
  return {
    verified: Boolean(input.verified),
    status: input.status || (input.verified ? "PASS" : "UNVERIFIED"),
    method: input.method || "none",
    sources: Array.isArray(input.sources) ? input.sources : [],
    crosscheck: input.crosscheck || null,
    confidence: typeof input.confidence === "number" ? input.confidence : null,
    checked_at: input.checked_at || new Date().toISOString()
  };
}

module.exports = { createVerificationRecord };
