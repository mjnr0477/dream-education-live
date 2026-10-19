"use strict";

// Read-only Cisco Meraki Dashboard API check for Dream Wi-Fi.
// Never provisions networks, changes SSIDs, or enables customer access.
function safeCode(status) {
  if (status === 401 || status === 404) return "invalid_api_key_or_dashboard_access";
  if (status === 403) return "insufficient_permissions";
  if (status === 429) return "provider_rate_limited";
  if (status >= 500) return "provider_temporarily_unavailable";
  return "provider_api_error";
}

async function checkMerakiReadiness({
  env = process.env,
  fetchImpl = globalThis.fetch
} = {}) {
  const apiKey = String(env.MERAKI_DASHBOARD_API_KEY || env.MERAKI_API_KEY || "").trim();
  if (!apiKey) {
    return {
      success: false,
      code: "provider_not_configured",
      message: "Set MERAKI_DASHBOARD_API_KEY in the server environment. Do not put the key in frontend code."
    };
  }
  if (typeof fetchImpl !== "function") {
    return { success: false, code: "fetch_unavailable", message: "HTTP fetch is unavailable on this server." };
  }

  let baseUrl = String(env.MERAKI_DASHBOARD_API_BASE_URL || "https://api.meraki.com/api/v1").trim();
  while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  if (!/^https:\/\/(api\.meraki\.com|api\.meraki\.ca|api\.meraki\.cn|api\.meraki\.in|api\.gov-meraki\.com)\/api\/v1$/i.test(baseUrl)) {
    return { success: false, code: "invalid_api_base_url", message: "The Meraki API base URL must be an official Cisco Meraki Dashboard API v1 endpoint." };
  }

  async function get(path) {
    let response;
    try {
      response = await fetchImpl(baseUrl + path, {
        method: "GET",
        headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10000)
      });
    } catch (_) {
      return { ok: false, status: 0, code: "provider_unreachable" };
    }
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      if (response && response.body && typeof response.body.cancel === "function") {
        await response.body.cancel().catch(() => {});
      }
      return { ok: false, status, code: safeCode(status) };
    }
    try {
      const payload = await response.json();
      return { ok: true, payload };
    } catch (_) {
      return { ok: false, status: 502, code: "invalid_provider_response" };
    }
  }

  const organizations = await get("/organizations");
  if (!organizations.ok) {
    return {
      success: false,
      code: organizations.code,
      http_status: organizations.status || null,
      message: organizations.code === "insufficient_permissions"
        ? "Meraki authenticated but the API key lacks organization-read permissions."
        : organizations.code === "provider_unreachable"
          ? "Dream could not reach the Meraki Dashboard API."
          : organizations.code === "provider_rate_limited"
            ? "Meraki rate-limited this check. Wait briefly and try again."
            : "Meraki rejected the request or returned an API error. Check the server-side key and its dashboard access."
    };
  }

  const orgs = Array.isArray(organizations.payload) ? organizations.payload : [];
  if (!orgs.length) {
    return {
      success: true,
      provider: "Cisco Meraki",
      authenticated: true,
      organization_count: 0,
      network_found: false,
      device_found: false,
      live_access_enabled: false,
      packages_enabled: false,
      message: "Meraki API authentication worked, but this account has no organizations available to the API key."
    };
  }

  // Probe only the first accessible organization and request the minimum supported page size per collection.
  // Do not expose organization names, network names, device serials, or other inventory.
  const orgId = encodeURIComponent(String(orgs[0].id || ""));
  if (!orgId) {
    return { success: false, code: "invalid_provider_response", message: "Meraki returned an organization without an ID." };
  }
  const [networks, devices] = await Promise.all([
    get("/organizations/" + orgId + "/networks?perPage=3"),
    get("/organizations/" + orgId + "/devices?perPage=3")
  ]);
  const failedEntry = [
    { name: "networks", result: networks },
    { name: "devices", result: devices }
  ].find((entry) => !entry.result.ok);
  if (failedEntry) {
    const failed = failedEntry.result;
    const statusLabel = failed.status ? " (HTTP " + failed.status + ")" : "";
    const message = failed.code === "insufficient_permissions"
      ? "Meraki organization access works, but the " + failedEntry.name + " inventory request was denied (HTTP 403). Check the API key's dashboard general configuration read permission and the organization's access policy."
      : failed.code === "invalid_api_key_or_dashboard_access"
        ? "Meraki organization access works, but the " + failedEntry.name + " inventory request returned HTTP " + failed.status + ". Confirm the selected organization is accessible and retry."
        : failed.code === "provider_unreachable"
          ? "Meraki organization access worked, but Dream could not reach the " + failedEntry.name + " inventory endpoint."
          : failed.code === "provider_rate_limited"
            ? "Meraki rate-limited the " + failedEntry.name + " inventory request. Wait briefly and retry."
            : "Meraki organization access worked, but the " + failedEntry.name + " inventory request failed" + statusLabel + ".";
    return {
      success: false,
      provider: "Cisco Meraki",
      code: failed.code,
      failed_endpoint: failedEntry.name,
      http_status: failed.status || null,
      network_http_status: networks.ok ? 200 : networks.status || null,
      device_http_status: devices.ok ? 200 : devices.status || null,
      message
    };
  }
  const networkFound = Array.isArray(networks.payload) && networks.payload.length > 0;
  const deviceFound = Array.isArray(devices.payload) && devices.payload.length > 0;
  return {
    success: true,
    provider: "Cisco Meraki",
    authenticated: true,
    organization_count: orgs.length,
    network_found: networkFound,
    device_found: deviceFound,
    live_access_enabled: false,
    packages_enabled: false,
    message: !networkFound
      ? "Meraki API is connected, but no network was found in the first accessible organization. This does not prove that no other organization has a network."
      : !deviceFound
        ? "Meraki API is connected and a network was found, but no device was returned for the first accessible organization. Confirm that an authorized Meraki access point is claimed and online."
        : "Meraki API authentication and read-only network/device inventory checks passed. This does not prove an SSID is broadcasting or that a phone can reach the internet; live access and packages remain disabled."
  };
}

module.exports = { checkMerakiReadiness };
