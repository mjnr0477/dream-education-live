(function () {
  "use strict";
  const AUTH_KEY = "dream_education_auth";
  const el = (id) => document.getElementById(id);
  const button = el("wifi-test");
  let ownerVerified = false;

  function token() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      return auth && auth.session && typeof auth.session.access_token === "string"
        ? auth.session.access_token : "";
    } catch (_) { return ""; }
  }

  function show(id, value) {
    const node = el(id);
    if (node) node.textContent = value;
  }

  async function ownerCheck() {
    const accessToken = token();
    if (!accessToken) {
      ownerVerified = false;
      show("wifi-owner-check", "Sign in required");
      show("wifi-api-state", "Owner sign-in required");
      show("wifi-message", "Sign in to Dream Education with the owner account to view this private prototype.");
      if (button) button.disabled = true;
      return false;
    }
    try {
      const response = await fetch("/api/dream-wifi/owner-status", {
        headers: { Accept: "application/json", Authorization: "Bearer " + accessToken },
        cache: "no-store"
      });
      const result = await response.json().catch(() => null);
      ownerVerified = !!(response.ok && result && result.success === true && result.owner === true);
      show("wifi-owner-check", ownerVerified ? "Verified" : "Owner access denied");
      if (!ownerVerified) {
        show("wifi-api-state", "Owner access required");
        show("wifi-message", "This prototype is private. Sign in with the Dream Education owner account.");
        if (button) button.disabled = true;
        return false;
      }
      show("wifi-api-state", "Prototype only — source not connected");
      show("wifi-network-state", "Tunnel not yet implemented");
      show("wifi-live-state", "No live access");
      show("wifi-api-check", "Awaiting authorized Quant connection");
      show("wifi-network-check", "Not built or tested");
      show("wifi-portal-check", "Transport path not tested");
      show("wifi-hardware-check", "Remote phone test pending");
      show("wifi-message", "Owner verified. The dashboard is ready for prototype work; it does not yet connect to Quant or provide internet.");
      if (button) button.disabled = false;
      return true;
    } catch (_) {
      ownerVerified = false;
      show("wifi-owner-check", "Could not verify");
      show("wifi-message", "Could not verify owner access. Check your connection and try again.");
      if (button) button.disabled = true;
      return false;
    }
  }

  if (button) {
    button.addEventListener("click", async function () {
      button.disabled = true;
      button.textContent = "Refreshing…";
      await ownerCheck();
      button.textContent = "Refresh readiness";
    });
  }
  window.addEventListener("storage", ownerCheck);
  window.addEventListener("dream-education-auth-changed", ownerCheck);
  ownerCheck();
})();