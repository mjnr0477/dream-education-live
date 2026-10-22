"use strict";

const assert = require("node:assert/strict");
const { normalizeObservation, ACCESS_STATES } = require("../product/dream_wifi_source_registry");

const valid = normalizeObservation({
  ssid: "  Kibabii Guest WiFi  ",
  latitude: 0.5698,
  longitude: 34.5584,
  gateway_detected: true,
  internet_verified: true,
  access_state: "captive_portal",
  observed_at: new Date().toISOString(),
  bssid: "AA:BB:CC:DD:EE:FF",
  password: "must-not-be-stored"
}, "user-123");

assert.equal(valid.error, undefined);
assert.equal(valid.record.ssid, "Kibabii Guest WiFi");
assert.equal(valid.record.latitude, 0.57);
assert.equal(valid.record.longitude, 34.558);
assert.equal(valid.record.gateway_detected, true);
assert.equal(valid.record.internet_verified, true);
assert.equal(valid.record.access_state, "captive_portal");
assert.equal(valid.record.remote_access_ready, false);
assert.equal(Object.hasOwn(valid.record, "bssid"), false);
assert.equal(Object.hasOwn(valid.record, "password"), false);
assert.match(valid.record.network_fingerprint, /^[a-f0-9]{64}$/);
assert.equal(ACCESS_STATES.has("authorized"), true);

assert.match(normalizeObservation({ ssid: "", latitude: 0, longitude: 0 }, "user-123").error, /SSID/);
assert.match(normalizeObservation({ ssid: "x", latitude: 200, longitude: 0 }, "user-123").error, /latitude/);
assert.equal(normalizeObservation({ ssid: "x", latitude: 0, longitude: 0, gateway_detected: false, internet_verified: true }, "user-123").record.internet_verified, false);

console.log("Dream Wi-Fi source registry smoke test passed.");
