(function () {
  "use strict";
  const AUTH_KEY = "dream_education_auth";
  const button = document.getElementById("wifi-refresh");
  const pingButton = document.getElementById("wifi-ping-source");
  const get = (id) => document.getElementById(id);
  let version = 0;
  let socketVersion = 0;
  let tunnelSocket = null;
  let ownerChannelReady = false;

  function token() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      return auth && auth.session && typeof auth.session.access_token === "string"
        ? auth.session.access_token : "";
    } catch (_) { return ""; }
  }
  function set(id, value) { const node = get(id); if (node) node.textContent = value; }
  function closeTunnel() {
    socketVersion += 1;
    ownerChannelReady = false;
    if (pingButton) pingButton.disabled = true;
    if (tunnelSocket) {
      const old = tunnelSocket;
      tunnelSocket = null;
      old.onclose = null;
      try { old.close(); } catch (_) {}
    }
  }

  function connectTunnel(accessToken) {
    closeTunnel();
    const current = socketVersion;
    set("wifi-source-endpoint", "Connecting to control endpoint…");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(protocol + "//" + window.location.host + "/api/dream-education/dream-wifi/tunnel");
    tunnelSocket = socket;

    socket.addEventListener("open", function () {
      if (current !== socketVersion) return socket.close();
      socket.send(JSON.stringify({ type: "register", role: "owner", accessToken }));
    });
    socket.addEventListener("message", function (event) {
      if (current !== socketVersion) return;
      let message;
      try { message = JSON.parse(event.data); } catch (_) { return; }
      if (message.type === "registered" && message.role === "owner") {
        ownerChannelReady = true;
        if (pingButton) pingButton.disabled = false;
        set("wifi-source-endpoint", "Owner control channel authenticated");
      } else if (message.type === "source-state") {
        set("wifi-source-endpoint", message.connected ? "Source agent connected" : "Source agent not connected");
      } else if (message.type === "ping-result") {
        set("wifi-source-endpoint", message.success
          ? "Source responds (" + Number(message.latency_ms) + " ms)"
          : String(message.error || "Source did not respond"));
      } else if (message.type === "error") {
        set("wifi-source-endpoint", String(message.error || "Control connection rejected"));
      }
    });
    socket.addEventListener("close", function () {
      if (current !== socketVersion) return;
      ownerChannelReady = false;
      if (pingButton) pingButton.disabled = true;
      set("wifi-source-endpoint", "Control channel disconnected");
    });
    socket.addEventListener("error", function () {
      if (current === socketVersion) set("wifi-source-endpoint", "Control endpoint unavailable");
    });
  }

  async function refresh() {
    const current = ++version;
    if (button) button.disabled = true;
    set("wifi-owner", "Verifying…");
    const accessToken = token();
    if (!accessToken) {
      closeTunnel();
      set("wifi-owner", "Sign in required");
      set("wifi-source", "Not connected");
      set("wifi-provider", "Owner sign-in required");
      set("wifi-source-endpoint", "Owner sign-in required");
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
        closeTunnel();
        set("wifi-owner", "Owner access denied");
        set("wifi-source", "Not connected");
        set("wifi-provider", "Owner access required");
        set("wifi-source-endpoint", "Owner access required");
        set("wifi-message", "This prototype is private. Sign in with the Dream Education owner account.");
        return;
      }
      set("wifi-owner", "Verified");
      set("wifi-source", "Not connected");
      set("wifi-tunnel", "Control plane implemented; traffic forwarding not implemented");
      set("wifi-live", "No live access");
      set("wifi-provider", result.provider_configured ? "Configured; verification pending" : "Not configured");
      set("wifi-source-endpoint", result.source_endpoint_configured
        ? "Configured; waiting for source agent"
        : "Not configured — source token required");
      set("wifi-transport", "Control channel not yet measured");
      set("wifi-phone", "Full traffic routing not implemented");
      set("wifi-message", "Owner verified. The control plane can check whether a source agent is reachable; it does not yet route internet traffic.");
      connectTunnel(accessToken);
    } catch (_) {
      if (current === version) {
        closeTunnel();
        set("wifi-owner", "Could not verify");
        set("wifi-message", "Could not verify owner access. Check your connection and retry.");
      }
    } finally {
      if (button && current === version) button.disabled = false;
    }
  }

  if (button) button.addEventListener("click", refresh);
  if (pingButton) pingButton.addEventListener("click", function () {
    if (!ownerChannelReady || !tunnelSocket || tunnelSocket.readyState !== WebSocket.OPEN) return;
    pingButton.disabled = true;
    set("wifi-source-endpoint", "Pinging source agent…");
    tunnelSocket.send(JSON.stringify({ type: "ping-source" }));
    window.setTimeout(function () {
      if (ownerChannelReady && pingButton) pingButton.disabled = false;
    }, 5500);
  });
  window.addEventListener("storage", refresh);
  window.addEventListener("dream-education-auth-changed", refresh);
  window.addEventListener("beforeunload", closeTunnel);
  refresh();
})();
