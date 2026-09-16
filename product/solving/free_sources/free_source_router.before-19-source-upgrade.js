const fs = require("fs");
const path = require("path");

const REGISTRY_PATH = path.join(__dirname, "free_source_registry.json");

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function routeFreeSources({ domain, problemType = "", question = "" }) {
  const registry = loadRegistry();
  const text = `${domain || ""} ${problemType || ""} ${question || ""}`.toLowerCase();

  const selected = registry.sources.filter(source => {
    const domainMatch =
      source.domains.includes("all") ||
      source.domains.includes(domain);

    if (!domainMatch) return false;

    // Mathematics/calculation sources
    if (
      ["mathematics", "physics", "engineering", "statistics_data",
       "units_measurement", "finance_accounting",
       "real_world_calculations"].includes(domain)
    ) {
      return ["sympy", "maxima", "sagemath", "sagemathcell",
              "calculator_free"].includes(source.id);
    }

    // Chemistry
    if (domain === "chemistry") {
      return ["pubchem", "sympy", "calculator_free"].includes(source.id);
    }

    // Biology
    if (domain === "biology_life_science") {
      return ["ncbi_entrez", "openalex", "pubchem"].includes(source.id);
    }

    // Research
    if (domain === "research_evidence") {
      return ["openalex", "ncbi_entrez"].includes(source.id);
    }

    // Astronomy
    if (domain === "astronomy_space_science") {
      return ["nasa", "openalex"].includes(source.id);
    }

    // Geography / environment / agriculture
    if (
      ["geography_earth_science", "environmental_science",
       "agriculture"].includes(domain)
    ) {
      return ["openalex", "nasa"].includes(source.id);
    }

    // General knowledge fallback
    if (text.includes("explain") || text.includes("what is") ||
        text.includes("describe")) {
      return source.id === "wikipedia";
    }

    return false;
  });

  return {
    success: true,
    domain,
    problem_type: problemType,
    selected_sources: selected.map(source => ({
      id: source.id,
      name: source.name,
      kind: source.kind,
      cost: source.cost,
      requires_key: source.requires_key,
      role: source.role,
      endpoint: source.endpoint || null
    }))
  };
}

module.exports = {
  loadRegistry,
  routeFreeSources
};
