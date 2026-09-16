"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");

async function pubchem(query, limit = 5) {
  await waitFor("pubchem", 250);

  const url =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
    encodeURIComponent(query) +
    "/property/Title,CanonicalSMILES,InChI,IUPACName/JSON";

  const data = await json(url);

  return (data.PropertyTable?.Properties || [])
    .slice(0, limit)
    .map(item => ({
      provider:"pubchem",
      source:"PubChem",
      title:String(item.Title || query),
      extract:[
        item.IUPACName,
        item.CanonicalSMILES,
        item.InChI
      ].filter(Boolean).join(" | "),
      url:`https://pubchem.ncbi.nlm.nih.gov/compound/${item.CID || ""}`
    }));
}

async function gbif(query, limit = 5) {
  await waitFor("gbif", 250);

  const data = await json(
    `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit,20)}`
  );

  return (data.results || []).map(item => ({
    provider:"gbif",
    source:"GBIF",
    title:String(item.scientificName || item.species || ""),
    extract:[
      item.kingdom,
      item.phylum,
      item.class,
      item.order,
      item.family,
      item.genus
    ].filter(Boolean).join(" > "),
    url:item.key
      ? `https://www.gbif.org/species/${item.key}`
      : ""
  })).filter(x => x.title);
}

async function uniprot(query, limit = 5) {
  await waitFor("uniprot", 250);

  const url =
    `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}` +
    `&format=json&size=${Math.min(limit,25)}`;

  const data = await json(url);

  return (data.results || []).map(item => ({
    provider:"uniprot",
    source:"UniProt",
    title:String(item.uniProtkbId || item.primaryAccession || ""),
    extract:String(item.proteinDescription?.recommendedName?.fullName?.value || ""),
    url:`https://www.uniprot.org/uniprotkb/${item.primaryAccession || ""}`
  })).filter(x => x.title);
}

async function rcsb(query, limit = 5) {
  await waitFor("rcsb", 250);

  const response = await fetch(
    "https://search.rcsb.org/rcsbsearch/v2/query",
    {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        query:{
          type:"terminal",
          service:"full_text",
          parameters:{value:String(query)}
        },
        return_type:"entry",
        request_options:{paginate:{start:0,rows:Math.min(limit,25)}}
      })
    }
  );

  if (!response.ok) {
    throw new Error(`RCSB HTTP ${response.status}`);
  }

  const data = await response.json();

  return (data.result_set || []).map(item => ({
    provider:"rcsb_pdb",
    source:"RCSB PDB",
    title:String(item.identifier || ""),
    extract:String(item.score || ""),
    url:`https://www.rcsb.org/structure/${item.identifier || ""}`
  }));
}

module.exports = {pubchem,gbif,uniprot,rcsb};
