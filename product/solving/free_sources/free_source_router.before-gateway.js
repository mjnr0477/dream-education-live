const fs = require("fs");
const path = require("path");

const REGISTRY_PATH = path.join(__dirname, "free_source_registry.json");

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function routeFreeSources({ domain, problemType = "", question = "" }) {
  const registry = loadRegistry();
  const text = `${domain || ""} ${problemType || ""} ${question || ""}`.toLowerCase();

  const preferred = {
    mathematics: [
      "sympy",
      "maxima",
      "sagemath",
      "sagemathcell",
      "calculator_free",
      "wikimedia",
      "wikidata",
      "arxiv"
    ],

    physics: [
      "sympy",
      "maxima",
      "sagemath",
      "calculator_free",
      "wikimedia",
      "wikidata",
      "arxiv"
    ],

    chemistry: [
      "pubchem",
      "sympy",
      "calculator_free",
      "wikimedia",
      "wikidata",
      "europe_pmc",
      "arxiv"
    ],

    biology_life_science: [
      "ncbi_entrez",
      "europe_pmc",
      "openalex",
      "pubchem",
      "wikimedia",
      "wikidata",
      "arxiv"
    ],

    statistics_data: [
      "sympy",
      "calculator_free",
      "eurostat",
      "wikidata",
      "wikimedia"
    ],

    units_measurement: [
      "sympy",
      "calculator_free",
      "wikidata",
      "wikimedia"
    ],

    finance_accounting: [
      "calculator_free",
      "sympy",
      "wikidata",
      "wikimedia"
    ],

    economics_business: [
      "calculator_free",
      "eurostat",
      "openalex",
      "wikidata",
      "wikimedia"
    ],

    engineering: [
      "sympy",
      "maxima",
      "sagemath",
      "calculator_free",
      "wikimedia",
      "wikidata",
      "arxiv"
    ],

    programming_code: [
      "wikimedia",
      "arxiv",
      "openalex",
      "calculator_free"
    ],

    computer_science: [
      "arxiv",
      "openalex",
      "wikimedia",
      "wikidata"
    ],

    optimization_operations_research: [
      "sympy",
      "sagemath",
      "calculator_free",
      "arxiv",
      "openalex"
    ],

    logic_reasoning: [
      "wikimedia",
      "wikidata",
      "arxiv",
      "openalex"
    ],

    word_problems: [
      "sympy",
      "calculator_free",
      "wikimedia"
    ],

    agriculture: [
      "openalex",
      "wikimedia",
      "wikidata",
      "eurostat",
      "arxiv"
    ],

    geography_earth_science: [
      "nasa",
      "eurostat",
      "wikidata",
      "wikimedia",
      "openalex",
      "arxiv"
    ],

    environmental_science: [
      "nasa",
      "eurostat",
      "openalex",
      "wikidata",
      "wikimedia",
      "arxiv"
    ],

    astronomy_space_science: [
      "nasa",
      "arxiv",
      "openalex",
      "wikidata",
      "wikimedia"
    ],

    research_evidence: [
      "openalex",
      "ncbi_entrez",
      "europe_pmc",
      "crossref",
      "semantic_scholar",
      "arxiv",
      "eurostat"
    ],

    technical_troubleshooting: [
      "wikimedia",
      "arxiv",
      "openalex"
    ],

    real_world_calculations: [
      "calculator_free",
      "sympy",
      "wikidata",
      "wikimedia"
    ],

    cross_domain: [
      "sympy",
      "calculator_free",
      "wikidata",
      "wikimedia",
      "openalex",
      "arxiv"
    ]
  };

  let selectedIds = preferred[domain] || [];

  // General knowledge questions can use Wikimedia/Wiktionary.
  if (
    /what is|who is|define|definition|meaning|explain|describe/.test(text)
  ) {
    selectedIds = [
      ...selectedIds,
      "wikimedia",
      "wikidata",
      "wiktionary"
    ];
  }

  selectedIds = [...new Set(selectedIds)];

  const selected = selectedIds
    .map(id => registry.sources.find(source => source.id === id))
    .filter(Boolean);

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
