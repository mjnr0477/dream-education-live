(function () {
  "use strict";
  const AUTH_KEY = "dream_education_auth";
  const button = document.getElementById("wifi-refresh");
  const pingButton = document.getElementById("wifi-ping-source");
  const testButton = document.getElementById("wifi-test-internet");
  const get = (id) => document.getElementById(id);
  let version = 0;
  let socketVersion = 0;
  let tunnelSocket = null;
  let ownerChannelReady = false;
  let activeProbe = null;

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
    if (testButton) testButton.disabled = true;
    if (activeProbe) {
      clearTimeout(activeProbe.timer);
      activeProbe = null;
    }
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
        if (testButton) testButton.disabled = false;
        set("wifi-source-endpoint", "Owner control channel authenticated");
      } else if (message.type === "source-state") {
        set("wifi-source-endpoint", message.connected ? "Source agent connected" : "Source agent not connected");
      } else if (message.type === "ping-result") {
        set("wifi-source-endpoint", message.success
          ? "Source responds (" + Number(message.latency_ms) + " ms)"
          : String(message.error || "Source did not respond"));
      } else if (activeProbe && message.id === activeProbe.id && message.type === "tcp-opened") {
        activeProbe.opened = true;
        const request = "GET / HTTP/1.1\\r\\nHost: example.com\\r\\nConnection: close\\r\\nUser-Agent: Dream-WiFi-Diagnostic/1.0\\r\\n\\r\\n";
        socket.send(JSON.stringify({ type: "tcp-data", id: activeProbe.id, data: btoa(request) }));
        set("wifi-message", "Source connected to example.com; waiting for the HTTP response through Dream Tunnel…");
      } else if (activeProbe && message.id === activeProbe.id && message.type === "tcp-data" && typeof message.data === "string") {
        let decoded = "";
        try { decoded = atob(message.data); } catch (_) {}
        activeProbe.response += decoded;
        if (activeProbe.response.length > 16384) activeProbe.response = activeProbe.response.slice(0, 16384);
        const match = activeProbe.response.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/);
        if (match) finishProbe(true, Number(match[1]), Date.now() - activeProbe.startedAt);
      } else if (activeProbe && message.id === activeProbe.id && (message.type === "tcp-error" || message.type === "tcp-close")) {
        finishProbe(false, 0, Date.now() - activeProbe.startedAt, message.error || "Source closed the internet test before an HTTP response arrived.");
      } else if (message.type === "error") {
        set("wifi-source-endpoint", String(message.error || "Control connection rejected"));
      }
    });
    socket.addEventListener("close", function () {
      if (current !== socketVersion) return;
      ownerChannelReady = false;
      if (pingButton) pingButton.disabled = true;
      if (testButton) testButton.disabled = true;
      if (activeProbe) finishProbe(false, 0, Date.now() - activeProbe.startedAt, "Control channel disconnected.");
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
      set("wifi-tunnel", "HTTP/HTTPS TCP relay implemented; live test pending");
      set("wifi-live", "No live access");
      set("wifi-provider", result.provider_configured ? "Configured; verification pending" : "Not configured");
      set("wifi-source-endpoint", result.source_endpoint_configured
        ? "Configured; waiting for source agent"
        : "Not configured — source token required");
      set("wifi-transport", "Control channel not yet measured");
      set("wifi-phone", "SOCKS5 proxy only; no full-device VPN");
      if (testButton) testButton.disabled = true;
      set("wifi-message", "Owner verified. The source agent and SOCKS5 relay can carry HTTP/HTTPS TCP streams when both endpoints are configured; live Quant routing has not yet been verified.");
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

  function finishProbe(success, statusCode, elapsedMs, error) {
    if (!activeProbe) return;
    const probe = activeProbe;
    activeProbe = null;
    clearTimeout(probe.timer);
    if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
      tunnelSocket.send(JSON.stringify({ type: "tcp-close", id: probe.id }));
    }
    if (testButton) testButton.disabled = !ownerChannelReady;
    if (success) {
      set("wifi-live", "HTTP response received (status " + statusCode + ")");
      set("wifi-transport", "Quant-to-Dream-to-public-internet test passed (" + elapsedMs + " ms)");
      set("wifi-message", "Live path verified for this test: the source reached example.com and its HTTP response returned through Dream Tunnel. This does not measure Wi-Fi signal strength or enable full-device VPN routing.");
    } else {
      set("wifi-live", "Internet path not verified");
      set("wifi-transport", "Test failed after " + elapsedMs + " ms");
      set("wifi-message", String(error || "No HTTP response received through the source tunnel."));
    }
  }

  if (button) button.addEventListener("click", refresh);
  if (testButton) testButton.addEventListener("click", function () {
    if (!ownerChannelReady || !tunnelSocket || tunnelSocket.readyState !== WebSocket.OPEN || activeProbe) return;
    const id = "dream-wifi-probe-" + Date.now().toString(36);
    activeProbe = { id, startedAt: Date.now(), response: "", opened: false, timer: null };
    activeProbe.timer = window.setTimeout(function () {
      finishProbe(false, 0, Date.now() - activeProbe.startedAt, "Timed out waiting for an HTTP response from example.com through the source endpoint.");
    }, 12000);
    testButton.disabled = true;
    set("wifi-live", "Testing…");
    set("wifi-transport", "Measuring end-to-end HTTP response…");
    set("wifi-message", "Sending a real HTTP request through the source endpoint to example.com.");
    tunnelSocket.send(JSON.stringify({ type: "tcp-open", id, host: "example.com", port: 80 }));
  });
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
