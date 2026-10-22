(function () {
  "use strict";
  const AUTH_KEY = "dream_education_auth";
  const button = document.getElementById("wifi-refresh");
  const pingButton = document.getElementById("wifi-ping-source");
  const testButton = document.getElementById("wifi-test-internet");
  const dnsButton = document.getElementById("wifi-test-dns");
  const sourceSelect = document.getElementById("wifi-source-select");
  const get = (id) => document.getElementById(id);
  function selectedSourceId() {
    return sourceSelect && sourceSelect.value ? sourceSelect.value : undefined;
  }
  function renderSources(sources) {
    if (!sourceSelect) return;
    const list = Array.isArray(sources) ? sources : [];
    const previous = sourceSelect.value;
    while (sourceSelect.options.length > 1) sourceSelect.remove(1);
    list.forEach(function (source) {
      if (!source || typeof source.id !== "string" || typeof source.name !== "string") return;
      const option = document.createElement("option");
      option.value = source.id;
      option.textContent = source.name + (source.connected ? " — online" : " — offline");
      sourceSelect.appendChild(option);
    });
    sourceSelect.value = list.some(function (source) { return source && source.id === previous; }) ? previous : "";
    set("wifi-source-list-status", list.length
      ? list.length + " registered source(s). Online status comes from the tunnel; source network identity unverified."
      : "No registered source endpoints are currently visible. A router must have an authorized client or gateway connected to Dream Tunnel.");
    if (list.length) set("wifi-source", list.filter(function (source) { return source && source.connected; }).length + " source(s) online");
  }
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
      } else if (message.type === "source-list") {
        renderSources(message.sources);
      } else if (message.type === "source-state") {
        set("wifi-source", message.connected
          ? "At least one source connected"
          : "No source connected");
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


  function formatObservationAge(value) {
    const observed = Date.parse(value || "");
    if (!Number.isFinite(observed)) return "time unknown";
    const minutes = Math.max(0, Math.floor((Date.now() - observed) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + " min ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + " hr ago";
    return Math.floor(hours / 24) + " day(s) ago";
  }

  function renderCountyObservations(observations) {
    const list = get("county-results");
    if (!list) return;
    list.replaceChildren();
    const rows = Array.isArray(observations) ? observations : [];
    const seen = new Set();
    rows.forEach(function (observation) {
      if (!observation || typeof observation.ssid !== "string") return;
      const key = observation.ssid + "|" + observation.latitude + "|" + observation.longitude;
      if (seen.has(key)) return;
      seen.add(key);
      const item = document.createElement("li");
      const details = document.createElement("span");
      const name = document.createElement("strong");
      const meta = document.createElement("span");
      const state = document.createElement("strong");
      name.textContent = observation.ssid;
      const distance = Number(observation.distance_km);
      const distanceText = Number.isFinite(distance) ? distance.toFixed(1) + " km away" : "distance unknown";
      const networkState = observation.internet_verified
        ? "Internet worked when reported"
        : observation.gateway_detected
          ? "Gateway detected; internet unverified"
          : "Wi-Fi detected only";
      meta.textContent = distanceText + " · " + networkState + " · last seen " + formatObservationAge(observation.observed_at);
      state.textContent = observation.remote_access_ready === true
        ? "Remote access marked ready"
        : "Observation only — no remote tunnel";
      details.appendChild(name);
      details.appendChild(document.createTextNode(" "));
      details.appendChild(meta);
      item.appendChild(details);
      item.appendChild(state);
      list.appendChild(item);
    });
    if (!list.children.length) {
      const empty = document.createElement("li");
      empty.textContent = "No reported Wi-Fi observations were found within this radius.";
      list.appendChild(empty);
    }
  }

  function searchCountySources() {
    const searchButton = get("county-search");
    const radiusControl = get("county-radius");
    const centerControl = get("county-center");
    const latitudeControl = get("county-latitude");
    const longitudeControl = get("county-longitude");
    const status = get("county-status");
    const accessToken = token();
    if (!status) return;
    if (!accessToken) {
      status.textContent = "Sign in to Dream Education before searching reported county Wi-Fi sources.";
      return;
    }
    const radius = Number(radiusControl && radiusControl.value || 25);
    if (!Number.isFinite(radius) || radius < 1 || radius > 100) {
      status.textContent = "Choose a search radius between 1 and 100 km.";
      return;
    }
    if (searchButton) searchButton.disabled = true;

    async function requestObservations(latitude, longitude, label) {
      try {
        status.textContent = "Searching reported Wi-Fi observations around " + label + "…";
        const query = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          radius_km: String(radius)
        });
        const response = await fetch("/api/dream-wifi/registry/observations?" + query.toString(), {
          headers: { Accept: "application/json", Authorization: "Bearer " + accessToken },
          cache: "no-store"
        });
        const result = await response.json().catch(function () { return null; });
        if (!response.ok || !result || result.success !== true) {
          status.textContent = result && result.error
            ? String(result.error)
            : "Could not retrieve county Wi-Fi observations. Check your sign-in and try again.";
          renderCountyObservations([]);
          return;
        }
        renderCountyObservations(result.observations);
        status.textContent = String(result.count || 0) + " reported observation(s) within " + radius +
          " km of " + label + ". These are reports, not a live radio scan or proof of remote tunnel access.";
      } catch (_) {
        status.textContent = "County Wi-Fi search failed. Check your connection and try again.";
      } finally {
        if (searchButton) searchButton.disabled = false;
      }
    }

    const center = centerControl && centerControl.value || "near-me";
    if (center === "kibabii") {
      // Approximate Kibabii University area; users can choose custom coordinates for another site.
      requestObservations(0.5698, 34.5584, "the Kibabii area");
      return;
    }
    if (center === "coordinates") {
      const latitude = Number(latitudeControl && latitudeControl.value);
      const longitude = Number(longitudeControl && longitudeControl.value);
      if (!latitudeControl || !longitudeControl || latitudeControl.value.trim() === "" ||
          longitudeControl.value.trim() === "" || !Number.isFinite(latitude) || latitude < -90 ||
          latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        if (searchButton) searchButton.disabled = false;
        status.textContent = "Enter a valid latitude and longitude for the location you want to search.";
        return;
      }
      requestObservations(latitude, longitude, "the selected coordinates");
      return;
    }
    if (!window.navigator.geolocation || typeof window.navigator.geolocation.getCurrentPosition !== "function") {
      if (searchButton) searchButton.disabled = false;
      status.textContent = "This browser cannot provide location. Choose Kibabii or enter coordinates, or use a supported browser.";
      return;
    }
    status.textContent = "Getting your location…";
    window.navigator.geolocation.getCurrentPosition(function (position) {
      requestObservations(Number(position.coords.latitude), Number(position.coords.longitude), "your current location");
    }, function (error) {
      if (searchButton) searchButton.disabled = false;
      const reason = error && error.code === 1
        ? "Location permission was denied. Allow location access and retry, or choose Kibabii/custom coordinates."
        : error && error.code === 3
          ? "Location lookup timed out. Retry or choose Kibabii/custom coordinates."
          : "Could not get your location. Enable device location or choose Kibabii/custom coordinates.";
      status.textContent = reason;
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
  }

  const countySearchButton = get("county-search");
  if (countySearchButton) countySearchButton.addEventListener("click", searchCountySources);
  window.addEventListener("dream-education-auth-changed", function () {
    const status = get("county-status");
    if (status) status.textContent = token()
      ? "Signed in. Search for Wi-Fi observations reported by field devices."
      : "Sign in and allow location access to search the cloud registry.";
  });

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
    tunnelSocket.send(JSON.stringify({ type: "udp-send", id, host: "1.1.1.1", port: 53, data: payload, sourceId: selectedSourceId() }));
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
    tunnelSocket.send(JSON.stringify({ type: "tcp-open", id, host: "example.com", port: 80, sourceId: selectedSourceId() }));
  });
  if (pingButton) pingButton.addEventListener("click", function () {
    if (!ownerChannelReady || !tunnelSocket || tunnelSocket.readyState !== WebSocket.OPEN) return;
    pingButton.disabled = true;
    set("wifi-source-endpoint", "Pinging source agent…");
    tunnelSocket.send(JSON.stringify({ type: "ping-source", sourceId: selectedSourceId() }));
    window.setTimeout(function () {
      if (ownerChannelReady && pingButton) pingButton.disabled = false;
    }, 5500);
  });
  window.addEventListener("storage", refresh);
  window.addEventListener("dream-education-auth-changed", refresh);
  window.addEventListener("beforeunload", closeTunnel);
  refresh();
})();
