"use strict";

/*
 * Dream Education Global Academic Source Registry
 *
 * This registry describes sources and their connection strategy.
 * It does NOT download entire datasets.
 * It does NOT replace the existing source_engine.
 * It does NOT modify server.js.
 *
 * Sources are queried on demand and cached selectively.
 */

const SOURCES = [
  // =========================
  // EXISTING CONNECTORS
  // =========================
  {
    id: "wikipedia",
    name: "Wikipedia",
    family: "general_knowledge",
    existing_connector: "source_engine.searchWikipedia",
    status: "connected",
    access: "free"
  },
  {
    id: "wikidata",
    name: "Wikidata",
    family: "structured_knowledge",
    existing_connector: "source_engine.searchWikidata",
    status: "connected",
    access: "free"
  },
  {
    id: "crossref",
    name: "Crossref",
    family: "scholarly_metadata",
    existing_connector: "source_engine.searchCrossref",
    status: "connected",
    access: "free"
  },
  {
    id: "openalex",
    name: "OpenAlex",
    family: "scholarly_research",
    existing_connector: "source_engine.searchOpenAlex",
    status: "connected",
    access: "free"
  },
  {
    id: "pubmed",
    name: "NCBI PubMed",
    family: "biomedical",
    existing_connector: "source_engine.searchNCBIPubMed",
    status: "connected",
    access: "free"
  },
  {
    id: "europe_pmc",
    name: "Europe PMC",
    family: "biomedical_research",
    existing_connector: "source_engine.searchEuropePMC",
    status: "connected",
    access: "free"
  },
  {
    id: "arxiv",
    name: "arXiv",
    family: "research",
    existing_connector: "source_engine.searchArxiv",
    status: "connected",
    access: "free"
  },
  {
    id: "noaa",
    name: "NOAA",
    family: "earth_atmospheric_science",
    existing_connector: "source_engine.searchNOAA",
    status: "connected",
    access: "free"
  },
  {
    id: "nasa",
    name: "NASA",
    family: "space_science",
    existing_connector: "source_engine.searchNASA",
    status: "connected",
    access: "free"
  },
  {
    id: "internet_archive",
    name: "Internet Archive",
    family: "digital_library",
    existing_connector: "source_engine.searchInternetArchive",
    status: "connected",
    access: "free"
  },
  {
    id: "library_of_congress",
    name: "Library of Congress",
    family: "library",
    existing_connector: "source_engine.searchLibraryOfCongress",
    status: "connected",
    access: "free"
  },
  {
    id: "datacite",
    name: "DataCite",
    family: "research_data",
    existing_connector: "source_engine.searchDataCite",
    status: "connected",
    access: "free"
  },

  // =========================
  // NEXT FREE/OPEN CONNECTORS
  // =========================
  {
    id: "openaire",
    name: "OpenAIRE Graph",
    family: "scholarly_research",
    connector: "openaire",
    status: "planned",
    access: "public_api"
  },
  {
    id: "doaj",
    name: "Directory of Open Access Journals",
    family: "open_access_journals",
    connector: "doaj",
    status: "planned",
    access: "free_oai_pmh"
  },
  {
    id: "unpaywall",
    name: "Unpaywall",
    family: "open_access_discovery",
    connector: "unpaywall",
    status: "planned",
    access: "free"
  },
  {
    id: "core",
    name: "CORE",
    family: "open_access_research",
    connector: "core",
    status: "planned",
    access: "free_tier"
  },
  {
    id: "oer_commons",
    name: "OER Commons",
    family: "open_education",
    connector: "oer_commons",
    status: "planned",
    access: "free"
  },
  {
    id: "open_textbook_library",
    name: "Open Textbook Library",
    family: "open_textbooks",
    connector: "open_textbook_library",
    status: "planned",
    access: "free"
  },
  {
    id: "openstax",
    name: "OpenStax",
    family: "open_textbooks",
    connector: "openstax",
    status: "planned",
    access: "free_with_license_rules"
  },
  {
    id: "mit_ocw",
    name: "MIT OpenCourseWare",
    family: "university_education",
    connector: "mit_ocw",
    status: "planned",
    access: "free_with_license_rules"
  },
  {
    id: "wikibooks",
    name: "Wikibooks",
    family: "open_textbooks",
    connector: "wikibooks",
    status: "planned",
    access: "free_with_license_rules"
  },
  {
    id: "ncbi_pmc",
    name: "PubMed Central",
    family: "biomedical_full_text",
    connector: "ncbi_pmc",
    status: "planned",
    access: "free_with_article_license_rules"
  },
  {
    id: "ncbi_bookshelf",
    name: "NCBI Bookshelf",
    family: "medical_scientific_books",
    connector: "ncbi_bookshelf",
    status: "planned",
    access: "free_with_license_rules"
  },
  {
    id: "pubchem",
    name: "PubChem",
    family: "chemistry",
    connector: "pubchem",
    status: "planned",
    access: "free"
  },
  {
    id: "nist",
    name: "NIST",
    family: "science_measurement",
    connector: "nist",
    status: "planned",
    access: "free"
  },
  {
    id: "gbif",
    name: "GBIF",
    family: "biodiversity",
    connector: "gbif",
    status: "planned",
    access: "free"
  },
  {
    id: "uniprot",
    name: "UniProt",
    family: "biology_proteins",
    connector: "uniprot",
    status: "planned",
    access: "free"
  },
  {
    id: "rcsb_pdb",
    name: "RCSB Protein Data Bank",
    family: "structural_biology",
    connector: "rcsb_pdb",
    status: "planned",
    access: "free"
  },
  {
    id: "usgs",
    name: "USGS",
    family: "earth_science",
    connector: "usgs",
    status: "planned",
    access: "free"
  }
];

function listSources() {
  return SOURCES.map(source => ({ ...source }));
}

function getSource(id) {
  return SOURCES.find(source => source.id === id) || null;
}

function getConnectedSources() {
  return SOURCES.filter(source => source.status === "connected");
}

function getPlannedSources() {
  return SOURCES.filter(source => source.status === "planned");
}

function getSourcesByFamily(family) {
  return SOURCES.filter(source => source.family === family);
}

module.exports = {
  SOURCES,
  listSources,
  getSource,
  getConnectedSources,
  getPlannedSources,
  getSourcesByFamily
};
