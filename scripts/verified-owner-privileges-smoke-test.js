"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const start = source.indexOf("const verifiedEmail = String(userData.user.email");
const end = source.indexOf("\n\n  return {\n    success: true,\n    user: userData.user,\n    account", start);
assert.notStrictEqual(start, -1, "Verified identity owner-resolution block must exist.");
assert.notStrictEqual(end, -1, "Owner-resolution block must terminate before the auth result.");
const block = source.slice(start, end);
assert.ok(block.includes("owner_account: ownerAccount"), "Owner flag must always come from verified identity.");
assert.ok(block.includes("free_forever: ownerAccount"), "Permanent-free flag must always come from verified identity.");
assert.ok(block.includes("storedAccount.plan_type === \"owner\""), "Stale owner plan metadata must be normalized for non-owners.");
assert.ok(block.includes("storedAccount.subscription_status === \"trial\" ? \"trial\" : \"paid\""), "Non-owner plan normalization must preserve trial state.");

const payment = require("../product/payment_engine");
assert.strictEqual(payment.isOwnerAccount({ email: "not-the-owner@example.invalid", owner_account: true }), false,
  "Persisted owner flags must not confer owner status.");
console.log("verified-owner-privileges-smoke-test: PASS");
