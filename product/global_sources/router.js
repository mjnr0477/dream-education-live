"use strict";

const catalog = require("./catalog");
const openalex = require("./providers/openalex");
const doaj = require("./providers/doaj");
const unpaywall = require("./providers/unpaywall");
const science = require("./providers/science");


const FAMILY_MAP = {
  mathematics:["openalex","doaj"],
  mathematics_education:["openalex","doaj","mit_ocw","openstax"],
  biology:["openalex","doaj","pubmed","europe_pmc","gbif","uniprot","rcsb_pdb"],
  chemistry:["openalex","doaj","pubchem","nist"],
  physics:["openalex","doaj","arxiv","nist"],
  medicine:["pubmed","pubmed_central","europe_pmc","openalex"],
  computer_science:["openalex","arxiv","github","stack_exchange"],
  environment:["gbif","noaa","usgs","openalex","doaj"],
  space:["nasa","openalex","arxiv"],
  economics:["world_bank","oecd","openalex"],
  general:["wikipedia","wikidata","openalex","crossref","datacite","doaj"]
};

const PROVIDERS = {
  openalex,
  doaj,
  unpaywall,

  // Trusted scientific providers are real network-backed providers,
  // not catalog-only placeholders.
  pubchem:{search:science.pubchem},
  gbif:{search:science.gbif},
  uniprot:{search:science.uniprot},
  rcsb_pdb:{search:science.rcsb}
};

function providerIds(queryInfo = {}) {
  const family =
    String(queryInfo.domain || queryInfo.subject || "general")
      .toLowerCase()
      .replace(/\s+/g,"_");

  return FAMILY_MAP[family] || FAMILY_MAP.general;
}

async function search(query, queryInfo = {}, limit = 5) {
  const ids = providerIds(queryInfo);
  const selected = ids
    .map(id => ({id, source:catalog.getSource(id), provider:PROVIDERS[id]}))
    .filter(x => x.provider && x.source);

  const tasks = selected.map(async item => {
    try {
      const result = await item.provider.search(query, limit);
      const rows = Array.isArray(result)
        ? result
        : Array.isArray(result?.results)
          ? result.results
          : [];

      return rows.map(row => ({
        ...row,
        global_source_id:item.id,
        source_family:item.source.family,
        license:item.source.license,
        commercial_use:item.source.commercial_use !== false
      }));
    } catch (error) {
      return [];
    }
  });

  const groups = await Promise.all(tasks);

  return {
    query,
    providers: selected.map(x => x.id),
    sources: groups.flat()
  };
}

module.exports = {
  search,
  providerIds,
  FAMILY_MAP
};
