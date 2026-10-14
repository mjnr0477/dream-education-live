"use strict";

const catalog = require("./catalog");
const openalex = require("./providers/openalex");
const doaj = require("./providers/doaj");
const unpaywall = require("./providers/unpaywall");
const science = require("./providers/science");
const biomedical = require("./providers/biomedical");
const data = require("./providers/data");
const repositories = require("./providers/repositories");
const core = require("./providers/core");
const crossref = require("./providers/crossref");
const arxiv = require("./providers/arxiv");
const googleBooks = require("./providers/google_books");


const FAMILY_MAP = {
  mathematics:["openalex","doaj"],
  mathematics_education:["openalex","doaj","core","google_books"],
  biology:["openalex","doaj","pubmed_central","ncbi_bookshelf","gbif","uniprot","rcsb_pdb"],
  chemistry:["openalex","doaj","pubchem"],
  physics:["openalex","doaj","arxiv"],
  medicine:["pubmed_central","ncbi_bookshelf","openalex","doaj"],
  computer_science:["openalex","arxiv","doaj","crossref"],
  environment:["gbif","openalex","doaj","world_bank"],
  space:["openalex","arxiv"],
  economics:["world_bank","openalex","doaj"],
  research:["openalex","doaj","unpaywall","zenodo","figshare","core","crossref","arxiv"],
  education:["openalex","doaj","core","google_books"],
  general:["openalex","doaj","unpaywall","zenodo","figshare","core","crossref","arxiv","google_books","world_bank","pubmed_central","ncbi_bookshelf","pubchem","gbif","uniprot","rcsb_pdb"]
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
  rcsb_pdb:{search:science.rcsb},
  pubmed_central:{search:biomedical.pubmedCentral},
  ncbi_bookshelf:{search:biomedical.ncbiBookshelf},
  world_bank:{search:data.worldBank},
  zenodo:{search:repositories.zenodo},
  figshare:{search:repositories.figshare},
  core:{search:core.search},
  crossref:{search:crossref.search},
  arxiv:{search:arxiv.search},
  google_books:{search:googleBooks.search}
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
