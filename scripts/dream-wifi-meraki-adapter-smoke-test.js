"use strict";

const assert = require("node:assert/strict");
const { checkMerakiReadiness } = require("../product/dream_wifi_meraki");

(async () => {
  let calls = 0;
  const missing = await checkMerakiReadiness({
    env: {},
    fetchImpl: async () => { calls++; throw new Error("must not call without a key"); }
  });
  assert.equal(missing.success, false);
  assert.equal(missing.code, "provider_not_configured");
  assert.equal(calls, 0);

  const invalidBase = await checkMerakiReadiness({
    env: { MERAKI_DASHBOARD_API_KEY: "test-key", MERAKI_DASHBOARD_API_BASE_URL: "https://example.invalid/api/v1" },
    fetchImpl: async () => { calls++; throw new Error("must not call an untrusted base URL"); }
  });
  assert.equal(invalidBase.code, "invalid_api_base_url");
  assert.equal(calls, 0);

  const requests = [];
  const ok = await checkMerakiReadiness({
    env: { MERAKI_DASHBOARD_API_KEY: "test-key", MERAKI_DASHBOARD_API_BASE_URL: "https://api.meraki.com/api/v1/" },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      const payload = url.endsWith("/organizations")
        ? [{ id: "org-test", name: "Private Org" }]
        : url.includes("/networks?")
          ? [{ id: "net-test", name: "Private Network" }]
          : [{ serial: "private-serial", model: "MR" }];
      return { ok: true, status: 200, json: async () => payload };
    }
  });
  assert.equal(ok.success, true);
  assert.equal(ok.authenticated, true);
  assert.equal(ok.organization_count, 1);
  assert.equal(ok.network_found, true);
  assert.equal(ok.device_found, true);
  assert.equal(ok.live_access_enabled, false);
  assert.equal(ok.packages_enabled, false);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].url, "https://api.meraki.com/api/v1/organizations");
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-key");
  assert.ok(requests.some((item) => item.url.endsWith("/networks?perPage=1")));
  assert.ok(requests.some((item) => item.url.endsWith("/devices?perPage=1")));
  assert.equal(JSON.stringify(ok).includes("Private Org"), false);
  assert.equal(JSON.stringify(ok).includes("private-serial"), false);

  const denied = await checkMerakiReadiness({
    env: { MERAKI_DASHBOARD_API_KEY: "test-key" },
    fetchImpl: async (url) => url.endsWith("/organizations")
      ? ({ ok: true, status: 200, json: async () => [{ id: "org-test" }] })
      : ({ ok: false, status: 403, body: { cancel: async () => {} } })
  });
  assert.equal(denied.success, false);
  assert.equal(denied.code, "insufficient_permissions");
  assert.equal(denied.failed_endpoint, "networks");
  assert.equal(denied.http_status, 403);
  assert.equal(denied.network_http_status, 403);
  assert.equal(denied.device_http_status, 403);
  assert.match(denied.message, /networks inventory request was denied/);

  console.log("Dream Wi-Fi Meraki adapter smoke test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
