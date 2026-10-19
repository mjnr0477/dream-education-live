"use strict";

const assert = require("node:assert/strict");
const {
  MAX_DURATION_SECONDS,
  getProviderConfig,
  createDreamWifiVoucher
} = require("../product/dream_wifi_ironwifi");

(async () => {
  assert.equal(MAX_DURATION_SECONDS, 365 * 24 * 60 * 60);
  assert.equal(getProviderConfig({}).configured, false);

  const missing = await createDreamWifiVoucher({
    durationSeconds: 3600,
    env: {},
    fetchImpl: async () => { throw new Error("must not call provider"); }
  });
  assert.equal(missing.success, false);
  assert.equal(missing.code, "provider_voucher_configuration_missing");

  for (const durationSeconds of [0, 59, 60.5, MAX_DURATION_SECONDS + 1, NaN]) {
    const result = await createDreamWifiVoucher({
      durationSeconds,
      env: {
        IRONWIFI_API_KEY: "test-secret",
        IRONWIFI_WIFI_API_BASE_URL: "https://example.invalid",
        IRONWIFI_WIFI_TABLE_ID: "test-group"
      },
      fetchImpl: async () => { throw new Error("invalid duration must not call provider"); }
    });
    assert.equal(result.success, false);
    assert.equal(result.code, "invalid_duration");
  }

  let request;
  const created = await createDreamWifiVoucher({
    durationSeconds: 3600,
    comment: "smoke test",
    env: {
      IRONWIFI_API_KEY: "test-secret",
      IRONWIFI_WIFI_API_BASE_URL: "https://wifi.example.test/",
      IRONWIFI_WIFI_TABLE_ID: "group-123"
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: "voucher-1", code: "TEST-1234" })
      };
    }
  });
  assert.equal(created.success, true);
  assert.deepEqual(created.voucher, {
    code: "TEST-1234",
    id: "voucher-1",
    duration_seconds: 3600
  });
  assert.equal(request.url, "https://wifi.example.test/vouchers");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer test-secret");
  assert.deepEqual(JSON.parse(request.options.body), {
    table_id: "group-123",
    duration: 3600,
    count: 1,
    comment: "smoke test"
  });

  const denied = await createDreamWifiVoucher({
    durationSeconds: 3600,
    env: {
      IRONWIFI_API_KEY: "test-secret",
      IRONWIFI_WIFI_API_BASE_URL: "https://wifi.example.test",
      IRONWIFI_WIFI_TABLE_ID: "group-123"
    },
    fetchImpl: async () => ({ ok: false, status: 403 })
  });
  assert.equal(denied.success, false);
  assert.equal(denied.code, "provider_permission_denied");
  assert.equal(JSON.stringify(denied).includes("test-secret"), false);

  const malformed = await createDreamWifiVoucher({
    durationSeconds: 3600,
    env: {
      IRONWIFI_API_KEY: "test-secret",
      IRONWIFI_WIFI_API_BASE_URL: "https://wifi.example.test",
      IRONWIFI_WIFI_TABLE_ID: "group-123"
    },
    fetchImpl: async () => ({ ok: true, status: 201, json: async () => ({ id: "no-code" }) })
  });
  assert.equal(malformed.success, false);
  assert.equal(malformed.code, "provider_voucher_code_missing");

  console.log("Dream Wi-Fi IronWiFi adapter smoke test passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
