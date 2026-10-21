(function () {
  "use strict";
  const AUTH_KEY = "dream_education_auth";
  const button = document.getElementById("wifi-refresh");
  const pingButton = document.getElementById("wifi-ping-source");
  const testButton = document.getElementById("wifi-test-internet");
  const dnsButton = document.getElementById("wifi-test-dns");
  const get = (id) => document.getElementById(id);
  let version = 0;
  let socketVersion = 0;
  let tunnelSocket = null;
  let ownerChannelReady = false;
  let activeProbe = null;
  let activeUdpProbe = null;
  let lastProbeResult = null;

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
    if (dnsButton) dnsButton.disabled = true;
    if (activeProbe) {
      clearTimeout(activeProbe.timer);
      activeProbe = null;
    }
    if (activeUdpProbe) {
      clearTimeout(activeUdpProbe.timer);
      activeUdpProbe = null;
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
        if (dnsButton) dnsButton.disabled = false;
        set("wifi-source-endpoint", "Owner control channel authenticated");
      } else if (message.type === "source-state") {
        set("wifi-source", message.connected
          ? "Connected; source network identity unverified"
          : "Not connected");
        set("wifi-source-endpoint", message.connected ? "Source agent connected" : "Source agent not connected");
      } else if (message.type === "ping-result") {
        set("wifi-source-endpoint", message.success
          ? "Source responds (" + Number(message.latency_ms) + " ms)"
          : String(message.error || "Source did not respond"));
      } else if (activeUdpProbe && message.id === activeUdpProbe.id && message.type === "udp-data" && typeof message.data === "string") {
        let bytes = [];
        try { bytes = Array.from(atob(message.data), function (character) { return character.charCodeAt(0); }); } catch (_) {}
        const elapsed = Date.now() - activeUdpProbe.startedAt;
        const validDns = bytes.length >= 12 && bytes[0] === activeUdpProbe.idBytes[0] && bytes[1] === activeUdpProbe.idBytes[1] && (bytes[2] & 0x80) !== 0 && (bytes[3] & 0x0f) === 0;
        finishUdpProbe(validDns, elapsed, validDns ? "" : "A UDP response arrived, but it was not a valid successful DNS reply.");
      } else if (activeUdpProbe && message.id === activeUdpProbe.id && message.type === "udp-error") {
        finishUdpProbe(false, Date.now() - activeUdpProbe.startedAt, String(message.error || "DNS/UDP relay failed"));
      } else if (activeProbe && message.id === activeProbe.id && message.type === "tcp-opened") {
        activeProbe.opened = true;
        const request = "GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\nUser-Agent: Dream-WiFi-Diagnostic/1.0\r\n\r\n";
        socket.send(JSON.stringify({ type: "tcp-data", id: activeProbe.id, data: btoa(request) }));
        set("wifi-message", "Source connected to example.com; waiting for the HTTP response through Dream Tunnel…");
      } else if (activeProbe && message.id === activeProbe.id && message.type === "tcp-data" && typeof message.data === "string") {
        let decoded = "";
        try { decoded = atob(message.data); } catch (_) {}
        activeProbe.response += decoded;
        if (activeProbe.response.length > 16384) activeProbe.response = activeProbe.response.slice(0, 16384);
        inspectHttpProbeResponse();
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
      if (dnsButton) dnsButton.disabled = true;
      if (activeProbe) finishProbe(false, 0, Date.now() - activeProbe.startedAt, "Control channel disconnected.");
      if (activeUdpProbe) finishUdpProbe(false, Date.now() - activeUdpProbe.startedAt, "Control channel disconnected.");
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
      set("wifi-source", "Checking source agent…");
      set("wifi-tunnel", "TCP 80/443 + bounded UDP relay; live tests pending");
      set("wifi-provider", !result.provider_configured
        ? "Not configured"
        : result.provider_auth_valid === true
          ? "Provider API verified; network/package pending"
          : result.provider_auth_valid === false
            ? "Provider API rejected credentials"
            : result.provider_api_reachable
              ? "Provider API reachable; auth unverified"
              : "Configured; API check failed");
      set("wifi-source-endpoint", result.source_connected
        ? "Source connected to Dream Tunnel"
        : result.source_auth_available
          ? "Native source authorization ready; source client not connected"
          : result.source_endpoint_configured
            ? "Static source configured; waiting for source agent"
            : "Source authorization unavailable");
      set("wifi-phone", "Android VPN prototype; physical-device test pending");
      if (testButton) testButton.disabled = true;
      if (!renderProbeResult()) {
        set("wifi-live", "Not tested in this page session");
        set("wifi-transport", "Run the end-to-end internet test");
        set("wifi-message", "Owner verified. Run the HTTP and DNS/UDP probes to test real public-internet responses through Dream Tunnel. These probes do not prove the Android phone is routing all app traffic.");
      }
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

  function renderProbeResult() {
    if (!lastProbeResult) return false;
    const result = lastProbeResult;
    if (result.success) {
      set("wifi-tunnel", "HTTP/HTTPS relay live test passed");
      set("wifi-live", "HTTP response received (status " + result.statusCode + ")");
      set("wifi-transport", "Quant-to-Dream-to-public-internet test passed (" + result.elapsedMs + " ms)");
      set("wifi-message", "Live path verified for this test: the source reached example.com and its HTTP response returned through Dream Tunnel. This does not measure Wi-Fi signal strength or enable full-device VPN routing.");
    } else {
      set("wifi-tunnel", "HTTP/HTTPS relay test failed");
      set("wifi-live", "Internet path not verified");
      set("wifi-transport", "Test failed after " + result.elapsedMs + " ms");
      set("wifi-message", String(result.error || "No HTTP response received through the source tunnel."));
    }
    return true;
  }

  function inspectHttpProbeResponse() {
    if (!activeProbe) return;
    const response = activeProbe.response;
    const headerEnd = response.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const headers = response.slice(0, headerEnd);
    const lines = headers.split("\r\n");
    const statusMatch = lines[0] && lines[0].match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/);
    if (!statusMatch) return;
    const statusCode = Number(statusMatch[1]);
    let location = "";
    lines.forEach(function (line) {
      if (/^location:/i.test(line)) location = line.slice(9).trim();
    });
    if (location) {
      try {
        const target = new URL(location, "http://example.com");
        if (target.hostname !== "example.com" && target.hostname !== "www.example.com") {
          finishProbe(false, statusCode, Date.now() - activeProbe.startedAt,
            "Quant captive portal redirect detected. Open the Quant portal and complete its package/payment flow.");
          return;
        }
        if (statusCode >= 300 && statusCode < 400) {
          finishProbe(true, statusCode, Date.now() - activeProbe.startedAt);
          return;
        }
      } catch (_) {
        finishProbe(false, statusCode, Date.now() - activeProbe.startedAt, "Unexpected redirect during the public internet test.");
        return;
      }
    }
    if (statusCode === 200) {
      const body = response.slice(headerEnd + 4);
      if (/example domain/i.test(body)) {
        finishProbe(true, statusCode, Date.now() - activeProbe.startedAt);
      } else if (body.length > 1024) {
        finishProbe(false, statusCode, Date.now() - activeProbe.startedAt,
          "Unexpected HTTP content received. A Quant captive portal may still be active.");
      }
    } else if (statusCode >= 400) {
      finishProbe(false, statusCode, Date.now() - activeProbe.startedAt,
        "Public internet test returned HTTP " + statusCode + ".");
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
    lastProbeResult = { success, statusCode, elapsedMs, error: error || "" };
    renderProbeResult();
  }

  function finishUdpProbe(success, elapsedMs, error) {
    if (!activeUdpProbe) return;
    const probe = activeUdpProbe;
    activeUdpProbe = null;
    clearTimeout(probe.timer);
    if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) tunnelSocket.send(JSON.stringify({ type: "udp-close", id: probe.id }));
    if (dnsButton) dnsButton.disabled = !ownerChannelReady;
    set("wifi-transport", success ? "HTTP + DNS/UDP relay probes passed" : "DNS/UDP test failed after " + elapsedMs + " ms");
    set("wifi-message", success
      ? "A valid DNS response for example.com returned from 1.1.1.1 through the authorized source, Dream Tunnel, and this dashboard. This verifies a DNS/UDP path, not all phone traffic or provider package access."
      : String(error || "No valid DNS response returned through the UDP relay."));
  }

  if (button) button.addEventListener("click", refresh);
  if (dnsButton) dnsButton.addEventListener("click", function () {
    if (!ownerChannelReady || !tunnelSocket || tunnelSocket.readyState !== WebSocket.OPEN || activeUdpProbe) return;
    const id = "dream-wifi-dns-" + Date.now().toString(36);
    const idBytes = [0x44, 0x57];
    const labels = ["example", "com"];
    const bytes = idBytes.concat([0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    labels.forEach(function (label) {
      const labelBytes = Array.from(label, function (character) { return character.charCodeAt(0); });
      bytes.push(labelBytes.length);
      bytes.push.apply(bytes, labelBytes);
    });
    bytes.push(0, 0, 1, 0, 1);
    const payload = btoa(String.fromCharCode.apply(null, bytes));
    activeUdpProbe = { id, idBytes, startedAt: Date.now(), timer: null };
    activeUdpProbe.timer = window.setTimeout(function () {
      finishUdpProbe(false, Date.now() - activeUdpProbe.startedAt, "Timed out waiting for a DNS/UDP response from 1.1.1.1:53.");
    }, 7000);
    dnsButton.disabled = true;
    set("wifi-transport", "Sending DNS query through Dream Tunnel…");
    set("wifi-message", "Testing DNS/UDP by resolving example.com through public resolver 1.1.1.1.");
    tunnelSocket.send(JSON.stringify({ type: "udp-send", id, host: "1.1.1.1", port: 53, data: payload }));
  });
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
