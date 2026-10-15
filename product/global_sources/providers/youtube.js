"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");

const MAX_RESULTS = 10;

// YouTube search is intentionally API-backed. Without a key, return no
// fabricated metadata and never scrape YouTube's HTML pages.
async function search(query, limit = 5) {
  const q = String(query || "").trim();
  const key = String(process.env.YOUTUBE_API_KEY || "").trim();
  if (!q) return [];

  // Without an API key, provide a direct YouTube search link only. This
  // intentionally does not scrape YouTube or represent the link as retrieved
  // video metadata; the learner opens YouTube to view current results.
  if (!key) {
    return [{
      provider: "youtube",
      source: "YouTube (direct search)",
      source_type: "search_link",
      title: "Search YouTube for: " + q.slice(0, 180),
      extract: "Direct search link only. Dream Education did not retrieve YouTube video metadata, transcripts, or video content. Open the link to view YouTube's current search results.",
      url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q),
      media: [],
      license: "YouTube Terms; direct user navigation only.",
      commercial_use: false,
      retrieval_mode: "direct_search_link"
    }];
  }

  await waitFor("youtube", 300);
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q,
    maxResults: String(Math.min(Math.max(Number(limit) || 5, 1), MAX_RESULTS)),
    safeSearch: "strict",
    videoEmbeddable: "true",
    key
  });

  const data = await json("https://www.googleapis.com/youtube/v3/search?" + params.toString());
  return (Array.isArray(data.items) ? data.items : []).map(item => {
    const id = String(item.id?.videoId || "");
    const snippet = item.snippet || {};
    const title = String(snippet.title || "").replace(/<[^>]*>/g, "").trim();
    const description = String(snippet.description || "").replace(/<[^>]*>/g, "").trim();
    if (!id || !title) return null;
    return {
      provider: "youtube",
      source: "YouTube",
      source_type: "educational_media",
      title,
      extract: description
        ? `YouTube video metadata. Title: ${title}. Channel: ${String(snippet.channelTitle || "Unknown channel")}. Published: ${String(snippet.publishedAt || "Date not supplied")}. Description: ${description.slice(0, 1400)}`
        : `YouTube video metadata. Title: ${title}. Channel: ${String(snippet.channelTitle || "Unknown channel")}.`,
      url: "https://www.youtube.com/watch?v=" + encodeURIComponent(id),
      media: [{ type: "video", provider: "youtube", url: "https://www.youtube.com/embed/" + encodeURIComponent(id) }],
      published_at: String(snippet.publishedAt || ""),
      channel: String(snippet.channelTitle || ""),
      license: "YouTube Terms; metadata and link only. Video rights remain with the uploader.",
      commercial_use: false
    };
  }).filter(Boolean);
}

module.exports = {search};
