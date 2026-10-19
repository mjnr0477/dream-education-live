"use strict";

// Dream Wi-Fi provider adapter.
// IronWiFi vouchers can be used by a compatible MikroTik captive-portal/RADIUS
// setup. This module never enables checkout or runs automatically: callers must
// explicitly request a single voucher only after verified payment and policy checks.
const MAX_DURATION_SECONDS = 365 * 24 * 60 * 60;

function getProviderConfig(env = process.env) {
  const apiKey = String(env.IRONWIFI_API_KEY || "").trim();
  // Require an explicitly selected tenant/region base URL for voucher writes.
  // Do not guess the tenant region from the read-only diagnostics URL.
  const baseUrl = String(env.IRONWIFI_WIFI_API_BASE_URL || "").trim().replace(/\/+$/, "");
  const tableId = String(env.IRONWIFI_WIFI_TABLE_ID || "").trim();

  return {
    configured: Boolean(apiKey && baseUrl && tableId),
    apiKey,
    baseUrl,
    tableId
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
  comment = "Dream Wi-Fi paid access",
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
      required: ["IRONWIFI_API_KEY", "IRONWIFI_WIFI_API_BASE_URL", "IRONWIFI_WIFI_TABLE_ID"]
    };
  }

  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/vouchers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        table_id: config.tableId,
        duration,
        count: 1,
        comment: String(comment).slice(0, 120)
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

  // Do not return provider payloads wholesale; only expose the minimum voucher
  // fields needed by a future authenticated, post-payment customer flow.
  const voucher = payload && (
    payload.voucher ||
    (payload._embedded && Array.isArray(payload._embedded.vouchers) && payload._embedded.vouchers[0]) ||
    (Array.isArray(payload.vouchers) && payload.vouchers[0]) ||
    payload
  );
  const code = voucher && typeof voucher.code === "string" ? voucher.code.trim() : "";
  const id = voucher && typeof voucher.id === "string" ? voucher.id.trim() : "";

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
