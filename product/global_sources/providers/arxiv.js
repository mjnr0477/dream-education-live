"use strict";

const {request} = require("../core/http");
const {waitFor} = require("../core/limiter");
const cache = require("../core/cache");

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function tag(block, name) {
  const match = String(block || "").match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "";
}

function normalizeRecord(block) {
  const title = tag(block, "title");
  if (!title) return null;
  const id = tag(block, "id");
  const summary = tag(block, "summary");
  const published = tag(block, "published");
  const authors = [...String(block).matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi)]
    .map(match => decodeXml(match[1].trim())).slice(0, 6);
  return {
    provider: "arxiv",
    source: "arXiv",
    title,
    extract: [summary, authors.length ? `Authors: ${authors.join(", ")}.` : "", published ? `Published: ${published.slice(0, 10)}.` : ""].filter(Boolean).join(" ").slice(0, 5000),
    url: id,
    published: published || null,
    license: "Check the individual preprint's license"
  };
}

async function search(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const cacheKey = `arxiv:${q}:${safeLimit}`;
  const cached = cache.read(cacheKey);
  if (cached) return cached;

  await waitFor("arxiv", 3500);
  const params = new URLSearchParams({
    search_query: `all:${q}`,
    start: "0",
    max_results: String(safeLimit)
  });
  const response = await request(`https://export.arxiv.org/api/query?${params.toString()}`, {
    timeout: 3500,
    headers: {Accept: "application/atom+xml"}
  });
  const blocks = [...response.body.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(match => match[1]);
  const results = blocks.map(normalizeRecord).filter(Boolean);
  cache.write(cacheKey, results);
  return results;
}

module.exports = {search, normalizeRecord};
