"use strict";

const { inferLearningResourceIntent } = require("./learning_resource_intent");

/*
 * Dream Education Universal Learning Resource Engine
 *
 * This layer discovers learning resources in the format a learner asks for.
 * It does NOT replace Knowledge Intelligence or the adaptive engine.
 *
 * Factual answers remain evidence-first. External media is a teaching aid.
 *
 * Supported connectors:
 * - Openverse: openly licensed images/audio
 * - Wikimedia Commons: public/open media search
 * - Internet Archive: books, texts, video, audio and other archive items
 * - YouTube Data API: optional video discovery when YOUTUBE_API_KEY exists
 *
 * The engine is intentionally connector-based so more providers can be
 * added without changing the learner/adaptive pipeline.
 */

const DEFAULT_LIMIT = 8;
const REQUEST_TIMEOUT_MS = 4500;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9%°µ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampLimit(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(n, 12));
}

function wantedTypes(value) {
  const allowed = new Set([
    "video", "image", "audio", "article", "book", "document",
    "research", "interactive", "experiment", "web", "any"
  ]);
  const values = Array.isArray(value) ? value : [value || "any"];
  const normalized = values.map(normalize).filter(Boolean);
  const selected = normalized.filter(type => allowed.has(type));
  return selected.length ? selected : ["any"];
}

function wants(types, type) {
  return types.includes("any") || types.includes(type);
}

function scoreResource(resource, query, context = {}) {
  const q = normalize(query);
  const text = normalize([
    resource.title, resource.description, ...(resource.tags || [])
  ].filter(Boolean).join(" "));
  if (!q || !text) return 0;
  const tokens = q.split(" ").filter(token => token.length > 2);
  if (!tokens.length) return 0;
  const matched = tokens.filter(token => text.includes(token));
  let score = matched.length / tokens.length;

  const quality = {
    openverse: 0.92,
    wikimedia_commons: 0.9,
    nasa: 0.98,
    nasa_osdr: 0.98,
    crossref: 0.97,
    internet_archive: 0.82,
    youtube: 0.72,
    phet: 0.95
  }[resource.provider] || 0.65;

  if (context.preferredTypes && context.preferredTypes.includes(resource.type)) {
    score += 0.35;
  }
  if (resource.license || resource.attribution_required) score += 0.04;
  score += quality * 0.18;
  return score;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchOpenverseImages(query, limit) {
  const url =
    "https://api.openverse.org/v1/images/?q=" +
    encodeURIComponent(query) +
    "&page_size=" + encodeURIComponent(limit);

  const data = await fetchJson(url);

  return (Array.isArray(data.results) ? data.results : []).map(item => ({
    type: "image",
    provider: "openverse",
    title: item.title || "Openly licensed image",
    description: item.description || "",
    url: item.foreign_landing_url || item.detail_url || item.url || null,
    media_url: item.url || null,
    thumbnail: item.thumbnail || null,
    creator: item.creator || null,
    license: item.license || null,
    license_url: item.license_url || null,
    attribution: item.attribution || null
  }));
}

async function searchOpenverseAudio(query, limit) {
  const url =
    "https://api.openverse.org/v1/audio/?q=" +
    encodeURIComponent(query) +
    "&page_size=" + encodeURIComponent(limit);

  const data = await fetchJson(url);

  return (Array.isArray(data.results) ? data.results : []).map(item => ({
    type: "audio",
    provider: "openverse",
    title: item.title || "Openly licensed audio",
    description: item.description || "",
    url: item.foreign_landing_url || item.detail_url || item.url || null,
    media_url: item.url || null,
    thumbnail: item.thumbnail || null,
    creator: item.creator || null,
    license: item.license || null,
    license_url: item.license_url || null,
    attribution: item.attribution || null
  }));
}

async function searchWikimediaImages(query, limit) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
    "&gsrsearch=" + encodeURIComponent(query) +
    "&gsrnamespace=6&gsrlimit=" + encodeURIComponent(limit) +
    "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*";

  const data = await fetchJson(url);
  const pages = Object.values(data.query?.pages || {});

  return pages.map(page => {
    const info = page.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const mime = normalize(info.mime);
    const mediaType = normalize(info.mediatype);
    let type = "image";
    if (mime.startsWith("video/") || mediaType === "video") type = "video";
    else if (mime.startsWith("audio/") || mediaType === "audio") type = "audio";
    else if (mime === "application/pdf" || mediaType === "document") type = "document";
    return {
      type,
      provider: "wikimedia_commons",
      title: String(page.title || "").replace(/^File:/, ""),
      description: meta.ImageDescription?.value || "",
      url: "https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title || ""),
      media_url: info.url || null,
      thumbnail: info.thumburl || null,
      creator: meta.Artist?.value || null,
      license: meta.LicenseShortName?.value || null,
      license_url: meta.LicenseUrl?.value || null
    };
  });
}

async function searchInternetArchive(query, limit) {
  const fields = [
    "identifier", "title", "description", "mediatype",
    "creator", "year", "collection"
  ].join(",");

  const url =
    "https://archive.org/advancedsearch.php?q=" +
    encodeURIComponent(query) +
    "&fl[]=" + encodeURIComponent(fields) +
    "&rows=" + encodeURIComponent(limit) +
    "&page=1&output=json";

  const data = await fetchJson(url);
  const docs = data.response?.docs || [];

  return docs.map(item => {
    const mediaType = normalize(item.mediatype);
    let type = "document";

    if (mediaType === "movies") type = "video";
    else if (mediaType === "audio") type = "audio";
    else if (mediaType === "texts") type = "book";
    else if (mediaType === "image") type = "image";

    return {
      type,
      provider: "internet_archive",
      title: item.title || item.identifier || "Internet Archive resource",
      description: Array.isArray(item.description)
        ? item.description[0]
        : (item.description || ""),
      url: item.identifier
        ? "https://archive.org/details/" + encodeURIComponent(item.identifier)
        : null,
      embed_url: item.identifier && (type === "video" || type === "audio")
        ? "https://archive.org/embed/" + encodeURIComponent(item.identifier)
        : null,
      identifier: item.identifier || null,
      creator: Array.isArray(item.creator) ? item.creator.join(", ") : (item.creator || null),
      year: item.year || null,
      collection: Array.isArray(item.collection) ? item.collection.slice(0, 3) : []
    };
  });
}


async function searchNASAImages(query, limit) {
  const url =
    "https://images-api.nasa.gov/search?q=" +
    encodeURIComponent(query) +
    "&media_type=image,video&page_size=" + encodeURIComponent(limit);

  const data = await fetchJson(url);
  const items = data.collection?.items || [];

  return items.map(item => {
    const dataItem = item.data?.[0] || {};
    const links = item.links || [];
    const preview = links.find(link => link.rel === "preview")?.href || null;
    const nasaId = dataItem.nasa_id || null;
    const type = String(dataItem.media_type || "image") === "video" ? "video" : "image";

    return {
      type,
      provider: "nasa",
      title: dataItem.title || "NASA learning media",
      description: dataItem.description || "",
      url: nasaId
        ? "https://images.nasa.gov/details/" + encodeURIComponent(nasaId)
        : null,
      media_url: preview,
      thumbnail: preview,
      creator: "NASA",
      published_at: dataItem.date_created || null,
      tags: Array.isArray(dataItem.keywords) ? dataItem.keywords : []
    };
  });
}

async function searchNASAExperiments(query, limit) {
  const url =
    "https://osdr.nasa.gov/geode-py/ws/api/experiments";

  const data = await fetchJson(url);
  const experiments = Array.isArray(data) ? data : (data.experiments || data.data || []);

  const tokens = normalize(query).split(" ").filter(token => token.length > 2);
  return experiments
    .filter(item => {
      const text = normalize([
        item.name,
        item.title,
        item.description,
        item.identifier,
        ...(item.keywords || [])
      ].filter(Boolean).join(" "));
      return !tokens.length || tokens.some(token => text.includes(token));
    })
    .slice(0, limit)
    .map(item => {
      const id = item.identifier || item.id || item.experiment_id || null;
      return {
        type: "experiment",
        provider: "nasa_osdr",
        title: item.name || item.title || "NASA experiment",
        description: item.description || "",
        url: id
          ? "https://osdr.nasa.gov/geode-py/ws/api/experiment/" + encodeURIComponent(id)
          : "https://osdr.nasa.gov/",
        creator: "NASA Open Science Data Repository",
        experiment_id: id
      };
    });
}

async function searchPhetExperiments(query, limit) {
  const normalizedQuery = encodeURIComponent(String(query || "").trim());
  if (!normalizedQuery) return [];

  return [{
    type: "experiment",
    provider: "phet",
    title: "PhET interactive simulation search: " + String(query).trim(),
    description: "Find an interactive science or mathematics simulation related to this topic.",
    url: "https://phet.colorado.edu/en/simulations/filter?search=" + normalizedQuery,
    embed_url: null,
    creator: "PhET Interactive Simulations, University of Colorado Boulder",
    attribution_required: true,
    license: "CC BY-NC 4.0 for regular HTML simulations; commercial use requires permission"
  }].slice(0, limit);
}


async function searchCrossrefResearch(query, limit) {
  const url =
    "https://api.crossref.org/works?query.bibliographic=" +
    encodeURIComponent(query) +
    "&rows=" + encodeURIComponent(limit) +
    "&select=DOI,title,author,published,URL,type,abstract,license";

  const data = await fetchJson(url, {
    headers: {
      "User-Agent": "Dream-Education/1.0 (educational-resource-discovery)"
    }
  });

  const items = data.message?.items || [];
  return items.map(item => ({
    type: "research",
    provider: "crossref",
    title: Array.isArray(item.title) ? item.title[0] : (item.title || "Research work"),
    description: item.abstract || "",
    url: item.URL || (item.DOI ? "https://doi.org/" + item.DOI : null),
    doi: item.DOI || null,
    creator: Array.isArray(item.author)
      ? item.author.slice(0, 4).map(author => [author.given, author.family].filter(Boolean).join(" ")).join(", ")
      : null,
    published_at: item.published?.["date-parts"]?.[0]?.join("-") || null,
    license: Array.isArray(item.license) ? item.license[0]?.URL || null : null
  }));
}

async function searchYouTube(query, limit) {
  const key = String(process.env.YOUTUBE_API_KEY || "").trim();
  if (!key) return [];

  const params = new URLSearchParams({
    key,
    q: query,
    part: "snippet",
    type: "video",
    maxResults: String(limit),
    videoEmbeddable: "true",
    safeSearch: "strict",
    order: "relevance"
  });

  const data = await fetchJson(
    "https://www.googleapis.com/youtube/v3/search?" + params.toString()
  );

  return (Array.isArray(data.items) ? data.items : []).map(item => ({
    type: "video",
    provider: "youtube",
    title: item.snippet?.title || "YouTube learning video",
    description: item.snippet?.description || "",
    url: item.id?.videoId
      ? "https://www.youtube.com/watch?v=" + encodeURIComponent(item.id.videoId)
      : null,
    embed_url: item.id?.videoId
      ? "https://www.youtube.com/embed/" + encodeURIComponent(item.id.videoId)
      : null,
    thumbnail: item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      null,
    creator: item.snippet?.channelTitle || null,
    published_at: item.snippet?.publishedAt || null
  }));
}

function resourceFailure(provider, error) {
  return {
    provider,
    success: false,
    error: error?.message || "resource provider unavailable"
  };
}

async function safeProvider(provider, operation) {
  try {
    return {
      provider,
      success: true,
      resources: await operation()
    };
  } catch (error) {
    return resourceFailure(provider, error);
  }
}

async function discoverLearningResources(query, options = {}) {
  const learnerQuery = String(query || "").trim();
  if (!learnerQuery) {
    return {
      success: false,
      error: "A learning topic or request is required.",
      resources: []
    };
  }

  const intent = inferLearningResourceIntent(learnerQuery, options.type || options.types);
  const types = wantedTypes(intent.types);
  const limit = clampLimit(options.limit);
  const subject = String(options.subject || "").trim();
  const level = String(options.level || "").trim();
  const searchQuery = [learnerQuery, subject, level]
    .filter(Boolean)
    .join(" ")
    .trim();

  const jobs = [];

  if (wants(types, "image")) {
    jobs.push(safeProvider("openverse", () =>
      searchOpenverseImages(searchQuery, limit)));
    jobs.push(safeProvider("wikimedia_commons", () =>
      searchWikimediaImages(searchQuery, Math.min(limit, 8))));
    jobs.push(safeProvider("nasa", () =>
      searchNASAImages(searchQuery, Math.min(limit, 8))));
  }

  if (wants(types, "audio")) {
    jobs.push(safeProvider("openverse_audio", () =>
      searchOpenverseAudio(searchQuery, limit)));
  }

  if (wants(types, "video")) {
    jobs.push(safeProvider("youtube", () =>
      searchYouTube(searchQuery, limit)));
    jobs.push(safeProvider("internet_archive", () =>
      searchInternetArchive(searchQuery, Math.min(limit, 8))));
    jobs.push(safeProvider("nasa", () =>
      searchNASAImages(searchQuery, Math.min(limit, 8))));
  }

  if (wants(types, "experiment") || wants(types, "interactive")) {
    jobs.push(safeProvider("phet", () =>
      searchPhetExperiments(searchQuery, Math.min(limit, 4))));
    jobs.push(safeProvider("nasa_osdr", () =>
      searchNASAExperiments(searchQuery, Math.min(limit, 8))));
  }

  if (wants(types, "research")) {
    jobs.push(safeProvider("crossref", () =>
      searchCrossrefResearch(searchQuery, limit)));
  }

  if (
    wants(types, "book") ||
    wants(types, "document") ||
    wants(types, "article") ||
    wants(types, "web") ||
    wants(types, "interactive") ||
    wants(types, "any")
  ) {
    jobs.push(safeProvider("internet_archive", () =>
      searchInternetArchive(searchQuery, limit)));
  }

  const results = await Promise.all(jobs);
  const resources = results
    .flatMap(result => result.success ? result.resources : [])
    .map(resource => ({
      ...resource,
      relevance: Number(scoreResource(resource, searchQuery, {
        preferredTypes: types.filter(type => type !== "any")
      }).toFixed(3))
    }))
    .filter(resource => resource.url || resource.media_url || resource.embed_url);

  const dedupe = new Map();
  for (const resource of resources) {
    const key = [
      resource.provider,
      resource.url || resource.media_url || resource.title
    ].join("|");
    if (!dedupe.has(key)) dedupe.set(key, resource);
  }

  const ranked = [...dedupe.values()]
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit * 3);

  return {
    success: true,
    query: learnerQuery,
    search_query: searchQuery,
    requested_types: types,
    intent: {
      mode: intent.mode,
      confidence: intent.confidence,
      reason: intent.reason
    },
    resources: ranked,
    providers: results.map(result => ({
      provider: result.provider,
      success: result.success,
      count: result.resources?.length || 0,
      error: result.success ? null : result.error
    }))
  };
}

module.exports = {
  discoverLearningResources,
  searchOpenverseImages,
  searchOpenverseAudio,
  searchWikimediaImages,
  searchInternetArchive,
  searchYouTube,
  searchNASAImages,
  searchNASAExperiments,
  searchPhetExperiments,
  searchCrossrefResearch
};
