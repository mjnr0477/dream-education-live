"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function ncbiDatabase(query, db, limit, sourceName) {
  await waitFor("ncbi", 250);
  const params = new URLSearchParams({
    db,
    term:String(query || "").trim(),
    retmode:"json",
    retmax:String(Math.min(Math.max(limit,1),10))
  });
  if (process.env.NCBI_EMAIL) params.set("email", process.env.NCBI_EMAIL);
  if (process.env.NCBI_API_KEY) params.set("api_key", process.env.NCBI_API_KEY);

  const search = await json(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?" + params
  );
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summaryParams = new URLSearchParams({
    db,
    id:ids.join(","),
    retmode:"json"
  });
  if (process.env.NCBI_EMAIL) summaryParams.set("email", process.env.NCBI_EMAIL);
  if (process.env.NCBI_API_KEY) summaryParams.set("api_key", process.env.NCBI_API_KEY);

  const summary = await json(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?" + summaryParams
  );

  return ids.map(id => {
    const item = summary?.result?.[id] || {};
    const title = clean(item.title || item.name || query);
    return {
      provider:db === "pmc" ? "pubmed_central" : "ncbi_bookshelf",
      source:sourceName,
      title,
      extract:clean(
        `${sourceName} record: ${title}. This record was retrieved through the official NCBI Entrez API for the learner's query.`
      ),
      url:db === "pmc"
        ? `https://pmc.ncbi.nlm.nih.gov/articles/PMC${id}/`
        : `https://www.ncbi.nlm.nih.gov/books/${id}/`
    };
  });
}

async function pubmedCentral(query, limit = 5) {
  return ncbiDatabase(query, "pmc", limit, "PubMed Central");
}

async function ncbiBookshelf(query, limit = 5) {
  return ncbiDatabase(query, "books", limit, "NCBI Bookshelf");
}

module.exports = {pubmedCentral, ncbiBookshelf};
