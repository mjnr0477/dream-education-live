"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");

async function zenodo(query, limit = 5) {
  await waitFor("zenodo", 250);
  const params = new URLSearchParams({
    q:String(query || "").trim(),
    size:String(Math.min(Math.max(limit,1),10))
  });
  const data = await json("https://zenodo.org/api/records/?" + params);
  return (data.hits?.hits || []).map(item => {
    const meta = item.metadata || {};
    return {
      provider:"zenodo",
      source:"Zenodo",
      title:String(meta.title || query),
      extract:[
        `Zenodo research record: ${meta.title || query}.`,
        meta.description ? String(meta.description) : "",
        meta.publication_date ? `Publication date: ${meta.publication_date}.` : ""
      ].filter(Boolean).join(" "),
      url:String(item.links?.self_html || item.links?.self || "")
    };
  });
}

async function figshare(query, limit = 5) {
  await waitFor("figshare", 250);
  const params = new URLSearchParams({
    search_for:String(query || "").trim(),
    limit:String(Math.min(Math.max(limit,1),10))
  });
  const data = await json("https://api.figshare.com/v2/articles?" + params);
  return (Array.isArray(data) ? data : []).map(item => ({
    provider:"figshare",
    source:"Figshare",
    title:String(item.title || query),
    extract:[
      `Figshare research record: ${item.title || query}.`,
      item.description ? String(item.description) : "",
      item.published_date ? `Published: ${item.published_date}.` : ""
    ].filter(Boolean).join(" "),
    url:String(item.url_public_api || item.url || "")
  }));
}

module.exports = {zenodo, figshare};
