/* Owner-only Dream Wi-Fi preview.
 * This UI intentionally does not create a Wi-Fi connection, sell packages, or call a provider.
 * Real provider access must be authorized and enforced server-side before public release.
 */
(function () {
  "use strict";

  const AUTH_KEY = "dream_education_auth";
  const section = document.getElementById("dream-wifi-section");
  const openButton = document.getElementById("dream-wifi-open");
  const dashboard = document.getElementById("dream-wifi-dashboard");
  const closeButton = document.getElementById("dream-wifi-close");
  const status = document.getElementById("dream-wifi-owner-status");

  if (!section || !openButton || !dashboard) return;

  function readAuth() {
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function isOwner() {
    const auth = readAuth();
    const account = auth && auth.account ? auth.account : {};
    return account.owner_account === true ||
      String(account.email || (auth && auth.email) || "").trim().toLowerCase() === "mathiassimiyu52@gmail.com";
  }

  function syncVisibility() {
    const allowed = isOwner();
    section.hidden = !allowed;
    if (!allowed) dashboard.hidden = true;
    if (status) status.textContent = allowed
      ? "Owner preview enabled for this signed-in browser."
      : "Owner sign-in required.";
  }

  openButton.addEventListener("click", function () {
    if (!isOwner()) {
      syncVisibility();
      return;
    }
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

  window.addEventListener("storage", syncVisibility);
  window.addEventListener("dream-education-auth-changed", syncVisibility);
  syncVisibility();
})();
