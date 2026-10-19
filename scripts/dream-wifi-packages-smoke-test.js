"use strict";

const assert = require("node:assert/strict");
const { getDreamWifiPackages } = require("../product/dream_wifi_packages");

const defaults = getDreamWifiPackages({});
assert.equal(defaults.length, 8);
assert.deepEqual(defaults.map((item) => item.name), [
  "1 hour", "2 hours", "5 hours", "12 hours",
  "1 day", "1 week", "1 month", "1 year"
]);
assert.equal(defaults[0].price_kes, 5);
assert.equal(defaults[0].price_source, "illustrative_example");
assert.equal(defaults[0].price_configured, false);
assert.equal(defaults[1].price_kes, null);
assert.equal(defaults[1].price_configured, false);
assert.ok(defaults.every((item) => item.duration_seconds > 0));

const configured = getDreamWifiPackages({ DREAM_WIFI_PRICE_2H: "9" })[1];
assert.equal(configured.price_kes, 9);
assert.equal(configured.price_configured, true);
assert.equal(configured.price_source, "server_environment");
assert.equal(getDreamWifiPackages({ DREAM_WIFI_PRICE_2H: "-3" })[1].price_kes, null);
assert.equal(getDreamWifiPackages({ DREAM_WIFI_PRICE_2H: "not-a-price" })[1].price_kes, null);

console.log("Dream Wi-Fi package catalogue smoke test passed.");
