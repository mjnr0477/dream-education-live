"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");
const cache = require("../core/cache");

async function search(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q) return [];

  const key = `doaj:${q}:${limit}`;
  const cached = cache.read(key);
  if (cached) return cached;

  await waitFor("doaj", 500);

  const pathQuery = encodeURIComponent(q);
  const url =
    `https://doaj.org/api/search/articles/${pathQuery}` +
    `?page=1&pageSize=${Math.min(Math.max(limit,1),100)}`;

  const data = await json(url);

  const results = (data.results || []).map(item => {
    const bib = item.bibjson || {};

    const links = Array.isArray(bib.link) ? bib.link : [];

    return {
      provider:"doaj",
      source:"DOAJ",
      title:String(bib.title || ""),
      extract:String(bib.abstract || ""),
      url:String(
        links.find(x => x.type === "fulltext")?.url ||
        links[0]?.url ||
        ""
      ),
      open_access:true
    };
  }).filter(x => x.title);

  cache.write(key, results);
  return results;
}

module.exports = {search};
