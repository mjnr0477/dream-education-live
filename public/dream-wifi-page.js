(function () {
  "use strict";
  const AUTH_KEY = "dream_education_auth";
  const el = (id) => document.getElementById(id);
  const button = el("wifi-test");
  let ownerVerified = false;
  function token() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      return auth && auth.session && typeof auth.session.access_token === "string" ? auth.session.access_token : "";
    } catch (_) { return ""; }
  }
  function show(id, value) { const node = el(id); if (node) node.textContent = value; }
  function recordCheckTime() { show("wifi-last-check", "Last provider check: " + new Date().toLocaleString()); }
  async function ownerCheck() {
    const accessToken = token();
    if (!accessToken) {
      ownerVerified = false;
      show("wifi-owner-check", "Sign in required");
      show("wifi-api-state", "Owner sign-in required");
      show("wifi-message", "Sign in to Dream Education with the owner account, then return to this Dream Wi-Fi page and run the provider check.");
      return false;
    }
    try {
      const response = await fetch("/api/dream-wifi/owner-status", {headers:{Accept:"application/json",Authorization:"Bearer "+accessToken},cache:"no-store"});
      const result = await response.json().catch(() => null);
      ownerVerified = !!(response.ok && result && result.success === true && result.owner === true);
      show("wifi-owner-check", ownerVerified ? "Verified" : "Owner access denied");
      if (!ownerVerified) show("wifi-message", "This setup check is private. Sign in using the Dream Education owner account.");
      return ownerVerified;
    } catch (_) {
      ownerVerified = false;
      show("wifi-owner-check", "Could not verify");
      show("wifi-message", "Could not verify owner access. Check your connection and try again.");
      return false;
    }
  }
  async function runCheck() {
    if (!button) return;
    button.disabled = true;
    recordCheckTime();
    const original = "Check provider setup";
    button.textContent = "Checking…";
    try {
      if (!ownerVerified && !(await ownerCheck())) return;
      const accessToken = token();
      const response = await fetch("/api/dream-wifi/provider-test", {headers:{Accept:"application/json",Authorization:"Bearer "+accessToken},cache:"no-store"});
      const result = await response.json().catch(() => null);
      if (!response.ok || !result || result.success !== true) {
        show("wifi-api-state", result && result.code === "invalid_api_key" ? "API key rejected" : result && result.code === "insufficient_permissions" ? "Permissions required" : result && result.code === "provider_not_configured" ? "API key missing" : "Provider check failed");
        show("wifi-api-check", result && result.code === "invalid_api_key" ? "Key rejected" : result && result.code === "insufficient_permissions" ? "Permissions required" : result && result.code === "provider_not_configured" ? "Server key missing" : "Not verified");
        show("wifi-network-count", "Not available");
        show("wifi-portal-count", "Not available");
        show("wifi-message", result && result.message ? result.message : "Provider check failed. Review server-side provider configuration.");
        return;
      }
      show("wifi-api-state", "API connected");
      show("wifi-api-check", "Connected");
      show("wifi-network-count", result.network_count === null || result.network_count === undefined ? "Unknown" : String(result.network_count));
      show("wifi-portal-count", result.captive_portal_count === null || result.captive_portal_count === undefined ? "Unknown" : String(result.captive_portal_count));
      show("wifi-network-check", result.network_configured ? "Configured" : "Create network in IronWiFi");
      show("wifi-portal-check", result.captive_portal_configured ? "Configured" : "Create captive portal in IronWiFi");
      show("wifi-network-state", result.network_configured && result.captive_portal_configured ? "Network and portal configured" : "Configuration incomplete");
      show("wifi-hardware-check", result.ready_for_hardware_test ? "Ready for authorized test" : "Waiting for network and portal");
      show("wifi-live-state", result.live_access_enabled === true && result.packages_enabled === true ? "Server reports enabled" : "Not enabled");
      show("wifi-message", result.message || "Provider configuration checked. A successful API check is not proof of live internet access.");
    } catch (_) {
      show("wifi-api-state", "Provider unreachable");
      show("wifi-api-check", "Connection failed");
      show("wifi-network-count", "Not available");
      show("wifi-portal-count", "Not available");
      show("wifi-message", "Could not reach the Dream Wi-Fi provider check. Please try again.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }
  if (button) button.addEventListener("click", runCheck);
  ownerCheck();
})();