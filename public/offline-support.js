(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;

  function announceConnection() {
    let status = document.getElementById("dream-offline-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "dream-offline-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.style.cssText = "position:fixed;z-index:99999;left:12px;right:12px;bottom:12px;padding:10px 14px;border-radius:12px;font:500 14px/1.4 system-ui,sans-serif;box-shadow:0 4px 20px #0002;display:none";
      document.body.appendChild(status);
    }
    if (!navigator.onLine) {
      status.textContent = "You’re offline. Cached learning pages may still open; sign-in, AI, sync and live features need internet.";
      status.style.background = "#fff1cf";
      status.style.color = "#573b00";
      status.style.display = "block";
    } else {
      status.textContent = "Back online. Online features are available again.";
      status.style.background = "#d9fbe8";
      status.style.color = "#064e3b";
      status.style.display = "block";
      window.setTimeout(function () {
        if (navigator.onLine && status) status.style.display = "none";
      }, 3500);
    }
  }

  window.addEventListener("offline", announceConnection);
  window.addEventListener("online", announceConnection);
  if (!navigator.onLine) window.addEventListener("DOMContentLoaded", announceConnection, { once: true });

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/service-worker.js").catch(function (error) {
      console.warn("Dream Education offline shell could not be registered.", error);
    });
  });
})();