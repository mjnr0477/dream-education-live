"use strict";

const https = require("https");

const TIMEOUT_MS = 3200;
const USER_AGENT = "DreamEducation/1.0 (open educational resource discovery)";

function get(url, timeout = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json,text/html;q=0.9,*/*;q=0.8" } }, response => {
      let body = "";
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error("HTTP " + (response.statusCode || "unknown")));
          return;
        }
        resolve({ body, contentType: String(response.headers["content-type"] || "") });
      });
    });
    request.on("error", reject);
    request.setTimeout(timeout, () => request.destroy(new Error("Request timed out")));
  });
}

function plainText(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function rowsFrom(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["results", "books", "items", "data", "hits"]) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === "object") {
      for (const nested of ["results", "books", "items", "hits"]) {
        if (Array.isArray(payload[key][nested])) return payload[key][nested];
      }
    }
  }
  return [];
}

async function searchLibreTexts(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q) return [];
  const params = new URLSearchParams({ query: q, q, limit: String(Math.min(Math.max(limit, 1), 5)) });
  const response = await get("https://commons.libretexts.org/api/v1/search/books-v2?" + params.toString());
  const payload = JSON.parse(response.body);
  const books = rowsFrom(payload).slice(0, Math.min(Math.max(limit, 1), 5));

  return Promise.all(books.map(async book => {
    const title = String(book.title || book.name || book.bookTitle || book.label || q).trim();
    const url = String(book.url || book.uri || book.href || book.web_url || book.link || "");
    const rawId = String(book.bookID || book.book_id || book.id || book.page_id || "");
    const match = rawId.match(/^(\w+)[-:]?(\d+)$/);
    const library = String(book.library || book.libraryCode || match?.[1] || "").toLowerCase();
    const pageId = String(book.pageId || book.page_id || match?.[2] || rawId.replace(/\D/g, ""));
    let extract = plainText([
      book.description, book.summary, book.abstract, book.snippet,
      book.subtitle, book.title || book.name
    ].filter(Boolean).join(". "));

    // Search catalog metadata first, then fetch the public page body when
    // the result exposes a resolvable LibreTexts library and page ID.
    if (library && pageId && /^[a-z0-9]+$/i.test(library) && /^\d+$/.test(pageId)) {
      try {
        const pageResponse = await get("https://" + library + ".libretexts.org/@api/deki/pages/" + pageId + "/contents");
        let pageBody = pageResponse.body;
        try {
          const pageJson = JSON.parse(pageBody);
          pageBody = pageJson.contents || pageJson.content || pageJson.body || pageJson.text || pageBody;
        } catch (_) {}
        const pageText = plainText(pageBody);
        if (pageText.length > extract.length) extract = pageText.slice(0, 5000);
      } catch (_) {}
    }

    return {
      title,
      extract,
      snippet: extract.slice(0, 600),
      source: "LibreTexts Open Textbooks",
      provider: "libretexts",
      source_type: "educational",
      url: url || (library && pageId ? "https://" + library + ".libretexts.org/@api/deki/pages/" + pageId : ""),
      license: String(book.license || book.license_name || ""),
      has_usable_content: extract.length >= 80
    };
  }));
}

async function searchOpenStax(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q) return [];
  const response = await get("https://openstax.org/apps/cms/api/books/?format=json");
  const payload = JSON.parse(response.body);
  const books = rowsFrom(payload);
  const terms = q.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  return books.map(book => {
    const title = String(book.title || book.name || book.slug || "").trim();
    const subjects = Array.isArray(book.subjects) ? book.subjects.join(", ") : String(book.subjects || book.subject || "");
    const description = plainText(book.description || book.summary || book.subtitle || book.abstract || "");
    const searchable = (title + " " + subjects + " " + description).toLowerCase();
    const matches = terms.filter(term => searchable.includes(term)).length;
    return { book, title, subjects, description, matches };
  }).filter(item => item.title && item.matches > 0)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, Math.min(Math.max(limit, 1), 5))
    .map(({ book, title, subjects, description }) => {
      const slug = String(book.slug || book.book_slug || book.id || "");
      const extract = plainText([title, subjects, description].filter(Boolean).join(". "));
      return {
        title,
        extract,
        snippet: extract.slice(0, 600),
        source: "OpenStax Free Textbooks",
        provider: "openstax",
        source_type: "educational",
        url: slug ? "https://openstax.org/books/" + encodeURIComponent(slug) : "https://openstax.org/",
        license: String(book.license || "Check the individual book's license"),
        has_usable_content: extract.length >= 80
      };
    });
}

module.exports = { searchLibreTexts, searchOpenStax };
