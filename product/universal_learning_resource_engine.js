"use strict";

const { inferLearningResourceIntent, extractLearningTopic } = require("./learning_resource_intent");

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

function isDirectMediaUrl(url, type) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  const value = String(url).toLowerCase();
  if (type === "image") return /\.(jpg|jpeg|png|gif|webp|svg)(\?|#|$)/i.test(value);
  if (type === "audio") return /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i.test(value);
  if (type === "video") return /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(value);
  return false;
}

function clampLimit(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(n, 24));
}

function wantedTypes(value) {
  const allowed = new Set(["video", "image", "audio", "text", "experiment", "interactive", "book", "document", "research", "article", "web", "any"]);
  const values = Array.isArray(value) ? value : String(value || "any").split(",");
  const normalized = values.flatMap(item => String(item || "").split(",")).map(normalize).filter(Boolean);
  const aliases = { photos: "image", photo: "image", pictures: "image", picture: "image", experiments: "experiment", simulations: "experiment" };
  const selected = normalized.map(type => aliases[type] || type).filter(type => allowed.has(type));
  return selected.length ? [...new Set(selected)] : ["any"];
}

function wants(types, type) {
  return types.includes("any") || types.includes(type);
}

function scoreResource(resource, query, context = {}) {
  const q = normalize(query);
  const title = normalize(resource.title);
  const description = normalize(resource.description);
  const tags = normalize((resource.tags || []).join(" "));
  const text = [title, description, tags].filter(Boolean).join(" ");
  if (!q || !text) return 0;

  const tokens = q.split(" ").filter(token => token.length > 2);
  if (!tokens.length) return 0;

  const matched = tokens.filter(token => text.includes(token));
  let score = matched.length / tokens.length;

  // Exact concept matches are much safer than generic request-word matches.
  if (title === q) score += 0.55;
  else if (title.includes(q)) score += 0.38;

  // Prefer resources whose title contains the complete concept phrase.
  const phraseTokens = q.split(" ").filter(Boolean);
  if (phraseTokens.length > 1 && phraseTokens.every(token => title.includes(token))) {
    score += 0.18;
  }

  const quality = {
    openverse: 0.92,
    wikimedia_commons: 0.94,
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
    "&prop=imageinfo&iiprop=url|mime|mediatype|extmetadata&iiurlwidth=800&format=json&origin=*";

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

  return Promise.all(docs.map(async item => {
    const mediaType = normalize(item.mediatype);
    let type = "document";

    if (mediaType === "movies") type = "video";
    else if (mediaType === "audio") type = "audio";
    else if (mediaType === "texts") type = "book";
    else if (mediaType === "image") type = "image";

    let mediaUrl = null;
    let embedUrl = null;

    // Embed support: embed_url: item.identifier && (type === "video" || type === "audio")
    if (item.identifier && (type === "video" || type === "audio")) {
      embedUrl = "https://archive.org/embed/" + encodeURIComponent(item.identifier);
      try {
        const metadata = await fetchJson(
          "https://archive.org/metadata/" + encodeURIComponent(item.identifier)
        );
        const files = Array.isArray(metadata.files) ? metadata.files : [];
        const extensions = type === "video"
          ? /\.(mp4|webm|ogv|m4v)$/i
          : /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
        const playable = files
          .map(file => String(file.name || ""))
          .find(name => extensions.test(name));
        if (playable) {
          mediaUrl =
            "https://archive.org/download/" +
            encodeURIComponent(item.identifier) + "/" +
            playable.split("/").map(encodeURIComponent).join("/");
        }
      } catch (_error) {
        // The archive item can still be embedded when its hosted player works.
      }
    }

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
      media_url: mediaUrl,
      embed_url: embedUrl,
      identifier: item.identifier || null,
      creator: Array.isArray(item.creator) ? item.creator.join(", ") : (item.creator || null),
      year: item.year || null,
      collection: Array.isArray(item.collection) ? item.collection.slice(0, 3) : []
    };
  }));
}


async function searchLibraryOfCongressImages(query, limit) {
  const params = new URLSearchParams({ fo: "json", q: query, c: String(Math.min(Number(limit) || 8, 24)) });
  const data = await fetchJson("https://www.loc.gov/photos/?" + params.toString());
  return (Array.isArray(data.results) ? data.results : []).map(item => {
    const imageCandidates = Array.isArray(item.image_url) ? item.image_url : [item.image_url];
    const mediaUrl = imageCandidates.find(url => typeof url === "string" && /^https?:\/\//i.test(url)) || null;
    return {
      type: "image",
      provider: "library_of_congress",
      title: item.title || "Library of Congress photograph",
      description: item.description || item.summary || item.notes || "",
      url: item.id || item.url || null,
      media_url: mediaUrl,
      thumbnail: mediaUrl,
      creator: item.contributor || item.created_published || "Library of Congress",
      license: item.rights || item.usage || null
    };
  }).filter(item => item.media_url);
}

async function searchNASAImages(query, limit) {
  const url =
    "https://images-api.nasa.gov/search?q=" +
    encodeURIComponent(query) +
    "&media_type=image,video&page_size=" + encodeURIComponent(limit);

  const data = await fetchJson(url);
  const items = data.collection?.items || [];

  return Promise.all(items.map(async item => {
    const dataItem = item.data?.[0] || {};
    const links = item.links || [];
    const preview = links.find(link => link.rel === "preview")?.href || null;
    const nasaId = dataItem.nasa_id || null;
    const type = String(dataItem.media_type || "image") === "video" ? "video" : "image";

    let mediaUrl = preview;
    if (type === "video" && nasaId) {
      try {
        const asset = await fetchJson(
          "https://images-api.nasa.gov/asset/" + encodeURIComponent(nasaId)
        );
        const assets = Array.isArray(asset.collection?.items)
          ? asset.collection.items
          : [];
        const playable = assets
          .map(entry => entry.href || "")
          .find(href => /\.(mp4|webm|ogv|m4v)(\?|#|$)/i.test(href));
        if (playable) mediaUrl = playable;
      } catch (_error) {
        // A NASA video without a playable asset is filtered later rather than
        // presented as a misleading image/page link.
      }
    }

    return {
      type,
      provider: "nasa",
      title: dataItem.title || "NASA learning media",
      description: dataItem.description || "",
      url: nasaId
        ? "https://images.nasa.gov/details/" + encodeURIComponent(nasaId)
        : null,
      media_url: mediaUrl,
      thumbnail: preview,
      creator: "NASA",
      published_at: dataItem.date_created || null,
      tags: Array.isArray(dataItem.keywords) ? dataItem.keywords : []
    };
  }));
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
  const raw = String(query || "").trim();
  const normalized = normalize(raw);
  if (!normalized) return [];

  const simulations = [
    { terms:["circuit","electricity","current","voltage","ohm","resistor","resistance"], title:"Circuit Construction Kit: DC", description:"Build circuits, connect batteries, bulbs, switches and resistors, and measure voltage and current.", slug:"circuit-construction-kit-dc" },
    { terms:["greenhouse","climate","carbon dioxide","co2","atmosphere"], title:"The Greenhouse Effect", description:"Explore how atmospheric gases affect radiation and temperature in a visual interactive model.", slug:"greenhouse" },
    { terms:["gas","pressure","temperature","volume","particle"], title:"Gas Properties", description:"Change pressure, volume and temperature and observe particle behavior in an interactive model.", slug:"gas-properties" },
    { terms:["motion","velocity","acceleration","position","speed"], title:"Moving Man", description:"Explore position, velocity and acceleration by controlling motion and observing the graphs.", slug:"moving-man" },
    { terms:["projectile","trajectory","launch","parabola"], title:"Projectile Motion", description:"Launch objects and investigate how angle, speed and gravity affect their trajectories.", slug:"projectile-motion" },
    { terms:["force","friction","net force","newton","forces and motion"], title:"Forces and Motion: Basics", description:"Experiment with forces, friction, mass and motion and observe the resulting changes.", slug:"forces-and-motion-basics" },
    { terms:["density","buoyancy","float","sink"], title:"Density", description:"Compare mass, volume and density and investigate why objects float or sink.", slug:"density" },
    { terms:["natural selection","evolution","adaptation","genetics","mutation","species"], title:"Natural Selection", description:"Change environmental factors and observe how traits affect a population over generations.", slug:"natural-selection" },
    { terms:["fraction","fractions","equivalent fractions","mixed numbers"], title:"Fractions: Intro", description:"Explore fractions visually and compare equivalent fractions using an interactive model.", slug:"fractions-intro" },
    { terms:["build a fraction","fraction model","numerator","denominator"], title:"Build a Fraction", description:"Build and compare fractions using visual models and interactive challenges.", slug:"build-a-fraction" },
    { terms:["balance chemical equations","chemical equation","reactants","products","chemistry equation"], title:"Balancing Chemical Equations", description:"Experiment with coefficients and balance atoms on both sides of a chemical equation.", slug:"balancing-chemical-equations" },
    { terms:["molecule shape","molecular geometry","bond angle","molecule shapes"], title:"Molecule Shapes", description:"Build molecules and explore how electron pairs affect molecular shape.", slug:"molecule-shapes" }
  ];

  const matches = simulations
    .map(sim => ({
      sim,
      matchedTerm: sim.terms
        .map(normalize)
        .filter(term => normalized.includes(term))
        .sort((a, b) => b.length - a.length)[0] || ""
    }))
    .filter(item => item.matchedTerm)
    .sort((a, b) => b.matchedTerm.length - a.matchedTerm.length);

  const match = matches[0]?.sim || null;

  if (!match) return [];

  return [{
    type:"experiment", provider:"phet", title:match.title, description:match.description,
    tags:match.terms,
    url:"https://phet.colorado.edu/en/simulations/" + match.slug + "?locale=en",
    embed_url:"https://phet.colorado.edu/sims/html/" + match.slug + "/latest/" + match.slug + "_en.html",
    creator:"PhET Interactive Simulations, University of Colorado Boulder",
    attribution_required:true,
    license:"CC BY-NC 4.0 for regular HTML simulations; commercial use requires permission"
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

function isCodingQuery(query) {
  return /(python|javascript|typescript|java|c\+\+|c#|html|css|react|node|sql|git|github|programming|coding|web development|computer science|algorithm|data structure|machine learning|ai development)/i.test(normalize(query));
}

// Never present a page-only result as playable; only direct media or a verified embeddable player belongs in the in-app media experience.
function isPlayableResource(resource) {
  if (!resource) return false;
  if (resource.type === "text") return Boolean(resource.content || resource.description);
  if (resource.type === "image") return Boolean(
    isDirectMediaUrl(resource.media_url, "image") ||
    isDirectMediaUrl(resource.thumbnail, "image")
  );
  if (!["video", "audio", "experiment"].includes(resource.type)) return false;
  return Boolean(
    isDirectMediaUrl(resource.media_url, resource.type) ||
    /^https?:\/\//i.test(resource.embed_url || "")
  );
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

  const requestedType = options.type || options.types || "any";
  const intent = inferLearningResourceIntent(learnerQuery, requestedType);
  const conceptQuery = extractLearningTopic(learnerQuery);
  const explicitTypes = wantedTypes(options.type || options.types);
  const types = explicitTypes.includes("any") ? intent.types : explicitTypes;
  const limit = clampLimit(options.limit);
  const subject = String(options.subject || "").trim();
  const level = String(options.level || "").trim();
  const searchQuery = [conceptQuery, subject, level].filter(Boolean).join(" ").trim();

  const jobs = [];

  if (wants(types, "image") || wants(types, "any")) {
    jobs.push(safeProvider("openverse", () => searchOpenverseImages(searchQuery, limit)));
    jobs.push(safeProvider("library_of_congress", () => searchLibraryOfCongressImages(searchQuery, Math.min(limit, 16))));
  }
  if (wants(types, "image") || wants(types, "video") || wants(types, "any")) {
    jobs.push(safeProvider("wikimedia_commons", () => searchWikimediaImages(searchQuery, Math.min(limit, 8))));
  }
  if (wants(types, "audio") || wants(types, "any")) {
    jobs.push(safeProvider("openverse_audio", () => searchOpenverseAudio(searchQuery, limit)));
  }
  if (wants(types, "video") || wants(types, "any")) {
    jobs.push(safeProvider("youtube", () => searchYouTube(searchQuery, limit)));
    jobs.push(safeProvider("internet_archive_video", () => searchInternetArchive(searchQuery, Math.min(limit, 8))));
    jobs.push(safeProvider("nasa", () => searchNASAImages(searchQuery, Math.min(limit, 8))));
  }
  if (
    wants(types, "text") ||
    wants(types, "book") ||
    wants(types, "document") ||
    wants(types, "research") ||
    wants(types, "article") ||
    wants(types, "web") ||
    wants(types, "interactive") ||
    wants(types, "any")
  ) {
    jobs.push(safeProvider("internet_archive_text", () => searchInternetArchive(searchQuery, limit)));
    jobs.push(safeProvider("crossref", () => searchCrossrefResearch(searchQuery, Math.min(limit, 8))));
  }
  if (wants(types, "experiment") || wants(types, "interactive") || wants(types, "any")) {
    // Only true interactive simulations belong in the media feed. NASA OSDR
    // datasets are valuable research data, but are not themselves in-app simulations.
    jobs.push(safeProvider("phet", () => searchPhetExperiments(conceptQuery, Math.min(limit, 4))));
  }

  const results = await Promise.all(jobs);
  const resources = results
    .flatMap(result => result.success ? result.resources : [])
    .map(resource => {
      let type = resource.type;
      if (["article", "book", "document", "research", "web"].includes(type)) type = "text";
      const normalized = {
        ...resource,
        type,
        content: resource.content || resource.description || "",
        resource_topic: conceptQuery,
        relevance: Number(scoreResource(resource, conceptQuery).toFixed(3))
      };

      normalized.direct_media = isDirectMediaUrl(normalized.media_url || "", normalized.type);
      normalized.media_playback =
        normalized.type === "text" ? "inline" :
        (isPlayableResource(normalized) ? "embedded" : "external");
      normalized.playable_in_app = normalized.type === "text"
        ? Boolean(normalized.content)
        : isPlayableResource(normalized);

      return normalized;
    })
    // Honor the requested media filter, including comma-separated feed modes.
    .filter(resource => {
      if (types.includes("any")) return true;
      const aliases = { article: "text", book: "text", document: "text", research: "text", web: "text", interactive: "experiment" };
      const allowedTypes = new Set(types.map(type => aliases[type] || type));
      return allowedTypes.has(resource.type);
    })
    // Keep only materials that can genuinely be experienced inside Dream Education.
    // A media feed never falls back to text/audio or non-interactive experiment pages.
    .filter(resource => {
      if (resource.type === "text") return Boolean(resource.content);
      if (resource.type === "image") return resource.playable_in_app && resource.relevance >= 0.35;
      if (resource.type === "video" || resource.type === "audio") return resource.playable_in_app && resource.relevance >= 0.35;
      if (resource.type === "experiment") return resource.playable_in_app && resource.relevance >= 0.35;
      return false;
    })
    .filter(resource => resource.url || resource.media_url || resource.embed_url);

  if (isCodingQuery(learnerQuery)) {
    // Coding resources use the same verified resource pipeline; no separate AI engine is introduced.
    resources.forEach(resource => {
      if (!resource.relevance_reason) {
        resource.relevance_reason =
          resource.relevance >= 1.05 ? "Strong coding concept match" :
          resource.relevance >= 0.65 ? "Good coding concept match" :
          "Related coding learning material";
      }
    });
  }

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
    .slice(0, limit);

  return {
    success: true,
    query: learnerQuery,
    resource_topic: conceptQuery,
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
  searchLibraryOfCongressImages,
  searchNASAExperiments,
  searchPhetExperiments,
  searchCrossrefResearch,
  wantedTypes,
  isPlayableResource,
  scoreResource
};
