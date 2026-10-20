(function () {
  "use strict";
  const AUTH_KEY = "dream_education_auth";
  const button = document.getElementById("wifi-refresh");
  const get = (id) => document.getElementById(id);
  let version = 0;

  function token() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      return auth && auth.session && typeof auth.session.access_token === "string"
        ? auth.session.access_token : "";
    } catch (_) { return ""; }
  }
  function set(id, value) { const node = get(id); if (node) node.textContent = value; }

  async function refresh() {
    const current = ++version;
    if (button) button.disabled = true;
    set("wifi-owner", "Verifying…");
    const accessToken = token();
    if (!accessToken) {
      set("wifi-owner", "Sign in required");
      set("wifi-source", "Not connected");
      set("wifi-provider", "Owner sign-in required");
      set("wifi-message", "Sign in to Dream Education with the owner account to view readiness.");
      if (button) button.disabled = false;
      return;
    }
    try {
      const response = await fetch("/api/dream-wifi/owner-status", {
        headers: { Accept: "application/json", Authorization: "Bearer " + accessToken },
        cache: "no-store"
      });
      const result = await response.json().catch(() => null);
      if (current !== version) return;
      if (!response.ok || !result || result.success !== true || result.owner !== true) {
        set("wifi-owner", "Owner access denied");
        set("wifi-source", "Not connected");
        set("wifi-provider", "Owner access required");
        set("wifi-message", "This prototype is private. Sign in with the Dream Education owner account.");
        return;
      }
      set("wifi-owner", "Verified");
      set("wifi-source", "Not connected");
      set("wifi-tunnel", "Not implemented or tested");
      set("wifi-live", "No live access");
      set("wifi-provider", result.provider_configured ? "Configured; verification pending" : "Not configured");
      set("wifi-transport", "Not tested");
      set("wifi-phone", "Not tested");
      set("wifi-message", "Owner verified. The dashboard is ready for prototype work; it does not connect to Quant or provide internet yet.");
    } catch (_) {
      if (current === version) {
        set("wifi-owner", "Could not verify");
        set("wifi-message", "Could not verify owner access. Check your connection and retry.");
      }
    } finally {
      if (button && current === version) button.disabled = false;
    }
  }
  if (button) button.addEventListener("click", refresh);
  window.addEventListener("storage", refresh);
  window.addEventListener("dream-education-auth-changed", refresh);
  refresh();
})();
