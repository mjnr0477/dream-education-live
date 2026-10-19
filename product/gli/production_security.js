"use strict";

const crypto = require("crypto");

const buckets = new Map();

function clientKey(req) {
  // req.ip is resolved by Express using the app's explicitly configured
  // trusted-proxy policy; never trust the raw X-Forwarded-For header here.
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

function rateLimit({ windowMs = 60_000, max = 60, prefix = "gli" } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = prefix + ":" + clientKey(req);
    const current = buckets.get(key);

    if (!current || now - current.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later."
      });
    }

    return next();
  };
}

function requestId(req, res, next) {
  const supplied = String(req.headers["x-request-id"] || "").trim();
  const id = /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : crypto.randomUUID();
  req.request_id = id;
  res.setHeader("X-Request-Id", id);
  return next();
}

function validateBodySize(maxBytes = 512 * 1024) {
  return (req, res, next) => {
    const length = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(length) && length > maxBytes) {
      return res.status(413).json({
        success: false,
        error: "Request body is too large."
      });
    }
    return next();
  };
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.startedAt >= 60_000) buckets.delete(key);
  }
}

setInterval(cleanup, 60_000).unref();

module.exports = { rateLimit, requestId, validateBodySize };
