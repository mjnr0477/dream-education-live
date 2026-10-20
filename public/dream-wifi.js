/* Dream Wi-Fi nav visibility is based on server-verified ownership, not local profile flags. */
(function () {
  "use strict";
  const link = document.getElementById("dream-wifi-nav");
  if (!link) return;
  const AUTH_KEY = "dream_education_auth";
  let requestVersion = 0;

  function accessToken() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      return auth && auth.session && typeof auth.session.access_token === "string"
        ? auth.session.access_token : "";
    } catch (_) {
      return "";
    }
  }

  async function verifyOwner() {
    const version = ++requestVersion;
    link.hidden = true;
    const token = accessToken();
    if (!token) return;
    try {
      const response = await fetch("/api/dream-wifi/owner-status", {
        method: "GET",
        headers: { Accept: "application/json", Authorization: "Bearer " + token },
        cache: "no-store"
      });
      const result = await response.json().catch(function () { return null; });
      if (version !== requestVersion) return;
      link.hidden = !(response.ok && result && result.success === true && result.owner === true);
    } catch (_) {
      if (version === requestVersion) link.hidden = true;
    }
  }

  window.addEventListener("storage", verifyOwner);
  window.addEventListener("dream-education-auth-changed", verifyOwner);
  verifyOwner();
})();
