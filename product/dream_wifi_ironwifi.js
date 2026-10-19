"use strict";

// Dream Wi-Fi provider adapter.
// Creates a single IronWiFi voucher only when explicitly called by trusted
// server-side code. This module is not connected to checkout or a public route.
const MAX_DURATION_SECONDS = 365 * 24 * 60 * 60;

function getProviderConfig(env = process.env) {
  const apiKey = String(env.IRONWIFI_API_KEY || "").trim();
  // Set this to the API base URL for the IronWiFi tenant's region, ending in /api.
  let baseUrl = String(env.IRONWIFI_WIFI_API_BASE_URL || "").trim();
  while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  // Optional for MSP/parent accounts managing a specific company tenant.
  const companyId = String(env.IRONWIFI_WIFI_COMPANY_ID || "").trim();

  return {
    configured: Boolean(apiKey && baseUrl),
    apiKey,
    baseUrl,
    companyId
  };
}

function safeProviderError(status) {
  if (status === 401) return "provider_authentication_failed";
  if (status === 403) return "provider_permission_denied";
  if (status === 404) return "provider_endpoint_or_region_not_found";
  if (status === 429) return "provider_rate_limited";
  if (status >= 500) return "provider_temporarily_unavailable";
  return "provider_request_rejected";
}

async function createDreamWifiVoucher({
  durationSeconds,
  env = process.env,
  fetchImpl = globalThis.fetch
} = {}) {
  const duration = Number(durationSeconds);
  if (!Number.isSafeInteger(duration) || duration < 60 || duration > MAX_DURATION_SECONDS) {
    return { success: false, code: "invalid_duration" };
  }
  if (typeof fetchImpl !== "function") {
    return { success: false, code: "fetch_unavailable" };
  }

  const config = getProviderConfig(env);
  if (!config.configured) {
    return {
      success: false,
      code: "provider_voucher_configuration_missing",
      required: ["IRONWIFI_API_KEY", "IRONWIFI_WIFI_API_BASE_URL"]
    };
  }

  const companyPath = config.companyId ? `/${encodeURIComponent(config.companyId)}` : "";
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}${companyPath}/vouchers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        voucher_duration: duration,
        voucher_redemption_limit: 1,
        voucher_devices: 1
      })
    });
  } catch (_) {
    return { success: false, code: "provider_network_error" };
  }

  if (!response || !response.ok) {
    return {
      success: false,
      code: safeProviderError(Number(response && response.status) || 0),
      http_status: Number(response && response.status) || null
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (_) {
    return { success: false, code: "provider_invalid_response" };
  }

  const voucher = payload && (
    payload.voucher ||
    (payload._embedded && Array.isArray(payload._embedded.vouchers) && payload._embedded.vouchers[0]) ||
    (Array.isArray(payload.vouchers) && payload.vouchers[0]) ||
    payload
  );
  const codeValue = voucher && (voucher.code || voucher.voucher_code || voucher.username);
  const code = typeof codeValue === "string" ? codeValue.trim() : "";
  const idValue = voucher && voucher.id;
  const id = typeof idValue === "string" || typeof idValue === "number" ? String(idValue).trim() : "";

  if (!code) {
    return { success: false, code: "provider_voucher_code_missing" };
  }

  return {
    success: true,
    voucher: { code, id: id || null, duration_seconds: duration }
  };
}

module.exports = {
  MAX_DURATION_SECONDS,
  getProviderConfig,
  createDreamWifiVoucher
};
