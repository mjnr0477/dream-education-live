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
        IRONWIFI_WIFI_API_BASE_URL: "https://example.invalid/api"
      },
      fetchImpl: async () => { throw new Error("invalid duration must not call provider"); }
    });
    assert.equal(result.success, false);
    assert.equal(result.code, "invalid_duration");
  }

  let request;
  const created = await createDreamWifiVoucher({
    durationSeconds: 3600,
    env: {
      IRONWIFI_API_KEY: "test-secret",
      IRONWIFI_WIFI_API_BASE_URL: "https://wifi.example.test/api/"
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: 123, voucher_code: "TEST-1234" })
      };
    }
  });
  assert.equal(created.success, true);
  assert.deepEqual(created.voucher, {
    code: "TEST-1234",
    id: "123",
    duration_seconds: 3600
  });
  assert.equal(request.url, "https://wifi.example.test/api/vouchers");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer test-secret");
  assert.deepEqual(JSON.parse(request.options.body), {
    voucher_duration: 3600,
    voucher_redemption_limit: 1,
    voucher_devices: 1
  });

  let tenantRequest;
  const tenantCreated = await createDreamWifiVoucher({
    durationSeconds: 7200,
    env: {
      IRONWIFI_API_KEY: "test-secret",
      IRONWIFI_WIFI_API_BASE_URL: "https://wifi.example.test/api",
      IRONWIFI_WIFI_COMPANY_ID: "company 123"
    },
    fetchImpl: async (url) => {
      tenantRequest = url;
      return { ok: true, status: 201, json: async () => ({ code: "TENANT-123" }) };
    }
  });
  assert.equal(tenantCreated.success, true);
  assert.equal(tenantRequest, "https://wifi.example.test/api/company%20123/vouchers");

  const denied = await createDreamWifiVoucher({
    durationSeconds: 3600,
    env: {
      IRONWIFI_API_KEY: "test-secret",
      IRONWIFI_WIFI_API_BASE_URL: "https://wifi.example.test/api"
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
      IRONWIFI_WIFI_API_BASE_URL: "https://wifi.example.test/api"
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
