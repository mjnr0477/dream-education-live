"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { rateLimit, requestId } = require("../product/gli/production_security");

const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const apiControlsIndex = serverSource.indexOf('app.use("/api/v1", requestId, rateLimit');
const firstApiV1RouteIndex = serverSource.search(/app\.(?:get|post|put|patch|delete)\(\s*["']\/api\/v1/);
assert.ok(apiControlsIndex >= 0, "API-wide rate limiting middleware must exist");
assert.ok(firstApiV1RouteIndex >= 0, "at least one /api/v1 route should exist");
assert.ok(apiControlsIndex < firstApiV1RouteIndex, "API-wide security middleware must be registered before every /api/v1 route");

function invokeRateLimit(middleware, ip, forwardedFor) {
  const req = {
    ip,
    socket: { remoteAddress: "127.0.0.1" },
    headers: { "x-forwarded-for": forwardedFor || "" }
  };
  const headers = {};
  let statusCode = 200;
  let body = null;
  let nextCalled = false;
  const res = {
    setHeader(name, value) { headers[name] = value; },
    status(code) {
      statusCode = code;
      return { json(value) { body = value; return this; } };
    },
    json(value) { body = value; return this; }
  };
  middleware(req, res, () => { nextCalled = true; });
  return { statusCode, headers, body, nextCalled };
}

const limiter = rateLimit({ windowMs: 60_000, max: 1, prefix: "spoof-test" });
const first = invokeRateLimit(limiter, "203.0.113.25", "198.51.100.1");
const second = invokeRateLimit(limiter, "203.0.113.25", "198.51.100.2");
assert.equal(first.nextCalled, true, "first request should pass");
assert.equal(second.statusCode, 429, "changing raw forwarded headers must not bypass the IP rate limit");
assert.equal(second.body.success, false);
assert.ok(Number(second.headers["Retry-After"]) > 0);

// A flood of unique client addresses must not grow the in-memory store without bound.
const boundedLimiter = rateLimit({ windowMs: 60_000, max: 1, prefix: "bounded-test", maxBuckets: 2 });
assert.equal(invokeRateLimit(boundedLimiter, "192.0.2.1").nextCalled, true);
assert.equal(invokeRateLimit(boundedLimiter, "192.0.2.2").nextCalled, true);
assert.equal(invokeRateLimit(boundedLimiter, "192.0.2.3").nextCalled, true);
assert.equal(
  invokeRateLimit(boundedLimiter, "192.0.2.1").nextCalled,
  true,
  "oldest bucket should be evicted when the configured capacity is reached"
);

const request = { headers: { "x-request-id": "bad request\r\nInjected: yes" } };
const responseHeaders = {};
const response = { setHeader(name, value) { responseHeaders[name] = value; } };
let nextCalled = false;
requestId(request, response, () => { nextCalled = true; });
assert.equal(nextCalled, true);
assert.match(request.request_id, /^[0-9a-f-]{36}$/i, "invalid request IDs should be replaced with a UUID");
assert.equal(responseHeaders["X-Request-Id"], request.request_id);

console.log("Production security rate-limit smoke test passed.");
