"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");
const cache = require("../core/cache");

async function search(query, limit = 5) {
  const q = String(query || "").trim();
  const apiKey = String(process.env.GOOGLE_BOOKS_API_KEY || "").trim();
  if (!q || !apiKey) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const cacheKey = `google_books:${q}:${safeLimit}`;
  const cached = cache.read(cacheKey);
  if (cached) return cached;

  await waitFor("google_books", 350);
  const params = new URLSearchParams({
    q,
    maxResults: String(safeLimit),
    printType: "books",
    key: apiKey
  });
  const data = await json(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    timeout: 3500
  });
  const results = (Array.isArray(data?.items) ? data.items : []).map(item => {
    const info = item.volumeInfo || {};
    const title = String(info.title || "").trim();
    if (!title) return null;
    const authors = Array.isArray(info.authors) ? info.authors.slice(0, 6) : [];
    const description = String(info.description || "").trim();
    const url = String(info.infoLink || item.volumeInfo?.previewLink || "").trim();
    const access = item.accessInfo || {};
    return {
      provider: "google_books",
      source: "Google Books",
      title,
      extract: [
        description,
        authors.length ? `Authors: ${authors.join(", ")}.` : "",
        info.publisher ? `Publisher: ${info.publisher}.` : "",
        info.publishedDate ? `Published: ${info.publishedDate}.` : "",
        info.categories?.length ? `Subjects: ${info.categories.slice(0, 4).join(", ")}.` : "",
        access.viewability ? `Viewability: ${access.viewability}.` : ""
      ].filter(Boolean).join(" ").slice(0, 5000),
      url,
      preview_url: String(info.previewLink || "").trim() || null,
      language: info.language || null,
      license: "Google Books API terms apply; descriptions and book content may be copyrighted"
    };
  }).filter(Boolean);
  cache.write(cacheKey, results);
  return results;
}

module.exports = {search};
