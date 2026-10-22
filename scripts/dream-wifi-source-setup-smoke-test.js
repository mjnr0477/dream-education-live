"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const scriptPath = "scripts/dream-wifi-source-setup.sh";
const script = fs.readFileSync(scriptPath, "utf8");
const syntax = spawnSync("bash", ["-n", scriptPath], { encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr || "Source setup script has invalid Bash syntax.");
assert.match(script, /DREAM_WIFI_TUNNEL_URL/);
assert.match(script, /DREAM_WIFI_SOURCE_TOKEN/);
assert.match(script, /read -r -s/);
assert.match(script, /\^wss:\/\//);
assert.match(script, /exec node/);
assert.doesNotMatch(script, /DREAM_WIFI_SOURCE_TOKEN\s*>/);
assert.doesNotMatch(script, /echo\s+.*DREAM_WIFI_SOURCE_TOKEN/);
console.log("Dream Wi-Fi source setup smoke test passed.");
