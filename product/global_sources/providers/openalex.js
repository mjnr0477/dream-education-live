"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");
const cache = require("../core/cache");

async function search(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q) return [];

  const key = `openalex:${q}:${limit}`;
  const cached = cache.read(key);
  if (cached) return cached;

  await waitFor("openalex", 250);

  const params = new URLSearchParams({
    search:q,
    is_oa:"true",
    per_page:String(Math.min(Math.max(limit,1),100))
  });

  if (process.env.OPENALEX_API_KEY) {
    params.set("api_key", process.env.OPENALEX_API_KEY);
  }

  const data = await json(
    `https://api.openalex.org/works?${params.toString()}`
  );

  const results = (data.results || []).map(item => ({
    provider:"openalex",
    source:"OpenAlex",
    title:String(item.title || ""),
    extract:String(
      item.abstract_inverted_index
        ? Object.entries(item.abstract_inverted_index)
            .sort((a,b) => Math.min(...a[1]) - Math.min(...b[1]))
            .map(x => x[0])
            .join(" ")
        : ""
    ),
    url:String(
      item.primary_location?.landing_page_url ||
      item.doi ||
      item.id ||
      ""
    ),
    open_access:Boolean(item.open_access?.is_oa),
    license:String(item.primary_location?.license || "")
  })).filter(x => x.title);

  cache.write(key, results);
  return results;
}

module.exports = {search};
