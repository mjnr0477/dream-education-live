"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const activity = fs.readFileSync(path.join(root, "android/dream-wifi-vpn/app/src/main/java/com/dreameducation/wifi/MainActivity.java"), "utf8");
const manifest = fs.readFileSync(path.join(root, "android/dream-wifi-vpn/app/src/main/AndroidManifest.xml"), "utf8");

for (const permission of [
  "android.permission.ACCESS_WIFI_STATE",
  "android.permission.CHANGE_WIFI_STATE",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.NEARBY_WIFI_DEVICES"
]) assert.ok(manifest.includes(permission), "Missing Android permission: " + permission);

for (const feature of [
  "WifiManager.SCAN_RESULTS_AVAILABLE_ACTION",
  "wifiManager.startScan()",
  "getApproximateLocation()",
  "probeInternetOnNetwork(activeNetwork)",
  "/api/dream-wifi/registry/observations",
  'observation.put("ssid", ssid)',
  'observation.put("gateway_detected", gatewayDetected)',
  'observation.put("internet_verified", internetVerified)',
  'observation.put("access_state", accessState)',
  "pendingAccessToken"
]) assert.ok(activity.includes(feature), "Android field scanner missing: " + feature);

assert.ok(activity.includes("boolean currentNetwork = activeWifi && ssid.equals(connectedSsid);"),
  "Only the phone's currently connected Wi-Fi can be checked as a live source.");
assert.ok(activity.includes("boolean gatewayDetected = currentNetwork && connectedGateway;"),
  "A scanned SSID must not be reported as a reachable gateway by radio detection alone.");
assert.ok(!activity.includes('observation.put("password"'),
  "Wi-Fi passwords must never be submitted to the cloud registry.");
assert.ok(!activity.includes('observation.put("bssid"'),
  "Wi-Fi BSSIDs are intentionally not stored in the cloud registry.");

const relay = fs.readFileSync(path.join(root, "android/dream-wifi-vpn/app/src/main/java/com/dreameducation/wifi/DreamWifiRelay.java"), "utf8");
const service = fs.readFileSync(path.join(root, "android/dream-wifi-vpn/app/src/main/java/com/dreameducation/wifi/DreamVpnService.java"), "utf8");
assert.ok(activity.includes("Publish this Wi-Fi as a remote source"), "Android app needs an explicit source-publishing mode.");
assert.ok(activity.includes("EXTRA_SOURCE_ONLY"), "Source-only mode must be passed to the foreground service.");
assert.ok(service.includes("findConnectedWifiNetwork()"), "Source mode must select a Wi-Fi network.");
assert.ok(service.includes("sourceOnly ? findConnectedWifiNetwork() : null"), "Source-only mode must be bound to the Wi-Fi network.");
assert.ok(relay.includes("sourceNetwork.bindSocket(socket)"), "Source TCP traffic must use the selected Wi-Fi network.");
assert.ok(relay.includes("sourceNetwork.bindSocket(socket);"), "Source DNS/UDP traffic must use the selected Wi-Fi network.");
assert.ok(relay.includes("if (!sourceOnly) {\n            workers.execute(this::serveSocks);\n            connectOwner();"), "A source-only phone must not start the owner VPN/SOCKS path.");
console.log("Dream Wi-Fi Android field scanner smoke test passed.");
