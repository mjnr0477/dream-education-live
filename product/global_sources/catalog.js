"use strict";

const SOURCES = [
  // GENERAL KNOWLEDGE
  {id:"wikipedia",name:"Wikipedia",family:"general",access:"api",license:"CC BY-SA",status:"connected"},
  {id:"wikidata",name:"Wikidata",family:"general",access:"api",license:"CC0",status:"connected"},
  {id:"internet_archive",name:"Internet Archive",family:"general",access:"api",license:"mixed",status:"connected"},
  {id:"library_of_congress",name:"Library of Congress",family:"general",access:"api",license:"mixed",status:"connected"},
  {id:"open_library",name:"Open Library",family:"general",access:"api",license:"mixed",status:"ready"},

  // RESEARCH
  {id:"openalex",name:"OpenAlex",family:"research",access:"rest",license:"CC0",status:"connected"},
  {id:"crossref",name:"Crossref",family:"research",access:"rest",license:"metadata/open",status:"connected"},
  {id:"datacite",name:"DataCite",family:"research",access:"rest",license:"metadata/open",status:"connected"},
  {id:"openaire",name:"OpenAIRE",family:"research",access:"rest",license:"mixed",status:"ready"},
  {id:"doaj",name:"DOAJ",family:"research",access:"rest",license:"open-access-index",status:"ready"},
  {id:"unpaywall",name:"Unpaywall",family:"research",access:"rest",license:"open-access-metadata",status:"ready"},
  {id:"core",name:"CORE",family:"research",access:"rest",license:"mixed/open",status:"planned"},
  {id:"base",name:"BASE",family:"research",access:"oai/web",license:"mixed",status:"planned"},

  // OPEN EDUCATION
  {id:"mit_ocw",name:"MIT OpenCourseWare",family:"education",access:"web",license:"CC BY-NC-SA",commercial_use:false,status:"ready"},
  {id:"openstax",name:"OpenStax",family:"education",access:"web",license:"CC BY-NC-SA",commercial_use:false,status:"ready"},
  {id:"open_textbook_library",name:"Open Textbook Library",family:"education",access:"web",license:"mixed-open",status:"ready"},
  {id:"oer_commons",name:"OER Commons",family:"education",access:"web",license:"mixed-open",status:"ready"},
  {id:"merlot",name:"MERLOT",family:"education",access:"web",license:"mixed",status:"planned"},
  {id:"wikibooks",name:"Wikibooks",family:"education",access:"api",license:"CC BY-SA",status:"ready"},
  {id:"bc_campus",name:"BCcampus Open Textbooks",family:"education",access:"web",license:"mixed-open",status:"ready"},

  // BIOMEDICAL
  {id:"pubmed",name:"PubMed",family:"biomedical",access:"api",license:"metadata/open",status:"connected"},
  {id:"pubmed_central",name:"PubMed Central",family:"biomedical",access:"api",license:"mixed",status:"ready"},
  {id:"ncbi_bookshelf",name:"NCBI Bookshelf",family:"biomedical",access:"api",license:"mixed",status:"ready"},
  {id:"europe_pmc",name:"Europe PMC",family:"biomedical",access:"api",license:"mixed/open",status:"connected"},

  // CHEMISTRY / PHYSICS
  {id:"pubchem",name:"PubChem",family:"chemistry",access:"rest",license:"public-domain/open",status:"ready"},
  {id:"nist",name:"NIST",family:"science",access:"web/api",license:"mixed",status:"ready"},
  {id:"arxiv",name:"arXiv",family:"research",access:"api",license:"mixed",status:"connected"},
  {id:"rcsb_pdb",name:"RCSB Protein Data Bank",family:"biology",access:"api",license:"CC0/data-open",status:"ready"},
  {id:"uniprot",name:"UniProt",family:"biology",access:"rest",license:"CC BY 4.0",status:"ready"},

  // BIOLOGY / ENVIRONMENT
  {id:"gbif",name:"GBIF",family:"biology",access:"rest",license:"mixed-open",status:"ready"},
  {id:"usgs",name:"USGS",family:"earth",access:"api",license:"mixed/open",status:"ready"},
  {id:"noaa",name:"NOAA",family:"earth",access:"api",license:"public/open",status:"connected"},
  {id:"nasa",name:"NASA",family:"space",access:"api",license:"public-domain/mixed",status:"connected"},

  // DATA / IDENTIFIERS
  {id:"data_commons",name:"Data Commons",family:"data",access:"api",license:"mixed",status:"planned"},
  {id:"world_bank",name:"World Bank Open Data",family:"economics",access:"api",license:"CC BY 4.0",status:"ready"},
  {id:"un_data",name:"UN Data",family:"global",access:"api/web",license:"mixed",status:"planned"},
  {id:"oecd",name:"OECD Data",family:"economics",access:"api",license:"mixed/open",status:"planned"},

  // SOFTWARE / COMPUTING KNOWLEDGE
  {id:"github",name:"GitHub public repositories",family:"software",access:"api",license:"repository-specific",status:"ready"},
  {id:"stack_exchange",name:"Stack Exchange",family:"software",access:"api",license:"CC BY-SA",status:"ready"},

  // ARCHIVES / REPOSITORIES
  {id:"zenodo",name:"Zenodo",family:"research",access:"api",license:"record-specific",status:"ready"},
  {id:"figshare",name:"Figshare",family:"research",access:"api",license:"record-specific",status:"ready"}
];

function listSources() {
  return SOURCES.map(x => ({...x}));
}

function getSource(id) {
  return SOURCES.find(x => x.id === id) || null;
}

function byFamily(family) {
  return SOURCES.filter(x => x.family === family).map(x => ({...x}));
}

module.exports = { SOURCES, listSources, getSource, byFamily };
