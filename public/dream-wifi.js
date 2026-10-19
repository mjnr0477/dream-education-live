/* Owner-only Dream Wi-Fi preview.
 * Visibility is granted only after the server validates the Supabase access token.
 * This UI does not create a Wi-Fi connection, sell packages, or call a provider.
 */
(function () {
  "use strict";

  const AUTH_KEY = "dream_education_auth";
  const section = document.getElementById("dream-wifi-section");
  const openButton = document.getElementById("dream-wifi-open");
  const dashboard = document.getElementById("dream-wifi-dashboard");
  const closeButton = document.getElementById("dream-wifi-close");
  const status = document.getElementById("dream-wifi-owner-status");
  let verifiedOwner = false;
  let requestVersion = 0;

  if (!section || !openButton || !dashboard) return;

  function readAuth() {
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function getAccessToken() {
    const auth = readAuth();
    return auth && auth.session && typeof auth.session.access_token === "string"
      ? auth.session.access_token
      : "";
  }

  function setHidden() {
    verifiedOwner = false;
    section.hidden = true;
    dashboard.hidden = true;
    openButton.setAttribute("aria-expanded", "false");
  }

  async function syncVisibility() {
    const version = ++requestVersion;
    const token = getAccessToken();

    // Hide first; localStorage account/email fields are not proof of ownership.
    setHidden();
    if (!token) {
      if (status) status.textContent = "Sign in with the owner account to view this private preview.";
      return;
    }

    try {
      const response = await fetch("/api/dream-wifi/owner-status", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + token
        },
        cache: "no-store"
      });
      const result = await response.json().catch(function () { return null; });

      // Ignore stale responses after a login/logout or a newer status request.
      if (version !== requestVersion) return;

      if (!response.ok || !result || result.success !== true || result.owner !== true) {
        if (status) status.textContent = "Owner verification required. Sign in with the owner account.";
        return;
      }

      verifiedOwner = true;
      section.hidden = false;
      if (status) {
        status.textContent = result.message ||
          "Owner verified. Provider access and packages remain disabled until tested.";
      }

      const providerStatus = dashboard.querySelector("[data-wifi-provider-status]");
      const accessStatus = dashboard.querySelector("[data-wifi-access-status]");
      const packageStatus = dashboard.querySelector("[data-wifi-package-status]");

      if (providerStatus) {
        providerStatus.textContent = result.provider_configured
          ? "Configured — verification pending"
          : "Not configured";
      }
      if (accessStatus) {
        accessStatus.textContent = result.live_access_enabled === true
          ? "Enabled by server"
          : "Not yet verified";
      }
      if (packageStatus) {
        packageStatus.textContent = result.packages_enabled === true
          ? "Enabled by server"
          : "Disabled";
      }
    } catch (_) {
      if (version !== requestVersion) return;
      if (status) status.textContent = "Could not verify owner access. Check your connection and try again.";
    }
  }

  openButton.addEventListener("click", async function () {
    await syncVisibility();
    if (!verifiedOwner) return;
    dashboard.hidden = false;
    openButton.setAttribute("aria-expanded", "true");
    dashboard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  if (closeButton) {
    closeButton.addEventListener("click", function () {
      dashboard.hidden = true;
      openButton.setAttribute("aria-expanded", "false");
      openButton.focus();
    });
  }

  const providerTestButton = document.getElementById("dream-wifi-provider-test");
  if (providerTestButton) {
    providerTestButton.addEventListener("click", async function () {
      if (!verifiedOwner) {
        await syncVisibility();
        if (!verifiedOwner) return;
      }

      const token = getAccessToken();
      if (!token) {
        if (status) status.textContent = "Sign in again before testing the provider.";
        return;
      }

      const originalLabel = providerTestButton.textContent;
      providerTestButton.disabled = true;
      providerTestButton.textContent = "Testing API…";
      if (status) status.textContent = "Checking IronWiFi securely from Dream's server…";

      try {
        const response = await fetch("/api/dream-wifi/provider-test", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token
          },
          cache: "no-store"
        });
        const result = await response.json().catch(function () { return null; });
        if (status) {
          status.textContent = result && result.message
            ? result.message
            : "The IronWiFi API test did not return a readable result.";
        }

        const providerStatus = dashboard.querySelector("[data-wifi-provider-status]");
        if (providerStatus) {
          if (response.ok && result && result.success === true) {
            providerStatus.textContent = "API authenticated — network test still required";
          } else if (result && result.code === "invalid_api_key") {
            providerStatus.textContent = "API key rejected";
          } else if (result && result.code === "insufficient_permissions") {
            providerStatus.textContent = "API key needs permissions";
          } else if (result && result.code === "provider_not_configured") {
            providerStatus.textContent = "API key not configured on server";
          } else {
            providerStatus.textContent = "API test unsuccessful";
          }
        }
      } catch (_) {
        if (status) status.textContent = "Could not complete the IronWiFi API test. Check Dream's connection and try again.";
      } finally {
        providerTestButton.disabled = false;
        providerTestButton.textContent = originalLabel;
      }
    });
  }

  window.addEventListener("storage", syncVisibility);
  window.addEventListener("dream-education-auth-changed", syncVisibility);
  syncVisibility();
})();
