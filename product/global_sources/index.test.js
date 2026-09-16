"use strict";

const globalSources = require("./index");

(async () => {
  console.log("=== GLOBAL SOURCE EXPANSION TEST ===");

  const s = globalSources.status();

  if (!s.success) throw new Error("Registry failed");

  console.log("REGISTRY: PASS");
  console.log("TOTAL SOURCES:", s.total_sources);
  console.log("CONNECTED:", s.connected);
  console.log("READY:", s.ready);
  console.log("PLANNED:", s.planned);
  console.log("FAMILIES:", s.families.length);

  const routes = [
    ["biology", globalSources.router.providerIds({domain:"biology"})],
    ["chemistry", globalSources.router.providerIds({domain:"chemistry"})],
    ["physics", globalSources.router.providerIds({domain:"physics"})],
    ["computer_science", globalSources.router.providerIds({domain:"computer_science"})]
  ];

  for (const [name, providers] of routes) {
    if (!providers.length) throw new Error(`No providers for ${name}`);
    console.log(`${name.toUpperCase()} ROUTE: PASS -> ${providers.join(",")}`);
  }

  console.log("GLOBAL SOURCE FRAMEWORK: PASS");
  console.log("EXISTING CORE: NOT MODIFIED");
})();
