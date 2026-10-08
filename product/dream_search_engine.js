'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  searchSources,
  getWikipediaPage,
  searchWikipedia,
  searchDuckDuckGo
} = require('./source_engine');
const { searchAuthorizedSources, loadConnectors } = require('./authorized_source_engine');
const { verifyCrossSourceEvidence, buildEvidenceSummary } = require('./cross_source_verifier');
const { filterSearchResults, buildSearchQuality } = require('./dream_search_quality');

function normalizeQuery(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
}

function normalizeSearchMedia(item) {
  const candidates = [
    ['image', item?.image], ['image', item?.images], ['image', item?.photo], ['image', item?.photos],
    ['video', item?.video], ['video', item?.videos],
    ['audio', item?.audio], ['audio', item?.audio_url],
    ['document', item?.document], ['document', item?.documents],
    ['media', item?.media]
  ].filter(([, value]) => Boolean(value));
  return candidates.flatMap(([hint, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map(raw => {
      if (typeof raw === 'string') return { type: hint, url: raw };
      if (!raw || typeof raw !== 'object') return null;
      const url = raw.url || raw.uri || raw.src || raw.content_url || raw.embed_url;
      if (!url || !/^https?:\/\//i.test(String(url))) return null;
      const kind = String(raw.type || raw.mime_type || hint).toLowerCase();
      const type = kind.includes('image') ? 'image' : kind.includes('video') ? 'video'
        : kind.includes('audio') ? 'audio' : kind.includes('pdf') || kind.includes('document') ? 'document' : hint;
      return { type, url: String(url), title: String(raw.title || raw.name || '').trim() || null };
    });
  }).filter(Boolean).slice(0, 8);
}

function publicResult(item) {
  return {
    title: String(item?.title || '').trim(),
    source: String(item?.source || item?.provider || 'Public source').trim(),
    provider: String(item?.provider || '').trim() || null,
    excerpt: String(item?.extract || item?.snippet || '').trim().slice(0, 3000),
    verification_score: Number.isFinite(Number(item?.verification_score)) ? Number(item.verification_score) : null,
    relevance_score: Number.isFinite(Number(item?.relevance_score)) ? Number(item.relevance_score) : null,
    cross_source_status: String(item?.cross_source_status || '').trim() || null,
    source_type: String(item?.source_type || '').trim() || null,
    has_usable_content: item?.has_usable_content !== false,
    content_length: Number.isFinite(Number(item?.content_length)) ? Number(item.content_length) : null,
    url: String(item?.url || '').trim() || null,
    evidence: Array.isArray(item?.evidence)
      ? item.evidence.slice(0, 8)
      : [{
          type: 'text',
          content: String(item?.extract || item?.snippet || '').trim().slice(0, 3000),
          source: String(item?.source || item?.provider || 'Public source').trim()
        }],
    media: normalizeSearchMedia(item)
  };
}

function buildDeepQueryVariants(query) {
  const normalized = normalizeQuery(query);
  const variants = new Set([normalized]);
  const compact = normalized.replace(/[?!.]+$/g, '').trim();

  if (compact.length >= 3 && compact.includes(' ')) {
    variants.add('"' + compact + '"');
  }

  const tokens = compact
    .replace(/["']/g, '')
    .split(/[^a-zA-Z0-9@.+_-]+/)
    .filter(token => token.length >= 3);

  if (tokens.length > 2) {
    variants.add(tokens.slice(0, 8).join(' '));
    variants.add(tokens.slice(0, 5).join(' ') + ' exact');
  }

  return [...variants].slice(0, 4);
}

function sourceIdentity(item) {
  return [
    String(item?.provider || item?.source || '').trim().toLowerCase(),
    String(item?.title || '').trim().toLowerCase(),
    String(item?.url || '').trim().toLowerCase()
  ].join('|');
}

function mergeDeepResults(results, limit = 30) {
  const map = new Map();

  for (const item of (Array.isArray(results) ? results : [])) {
    const key = sourceIdentity(item);
    if (!key || key === '||') continue;

    const previous = map.get(key);
    if (!previous) {
      map.set(key, item);
      continue;
    }

    const previousText = String(previous.extract || previous.excerpt || '').length;
    const currentText = String(item.extract || item.excerpt || '').length;
    if (currentText > previousText) map.set(key, { ...previous, ...item });
  }

  return [...map.values()].slice(0, Math.min(Number(limit) || 30, 50));
}

async function deepPublicSearch(query, limit = 8) {
  const variants = buildDeepQueryVariants(query);
  const perQueryLimit = Math.min(Math.max(Number(limit) || 8, 5), 12);

  const settled = await Promise.all(
    variants.map(async variant => {
      try {
        return await searchSources(variant, perQueryLimit);
      } catch (error) {
        return { success: false, sources: [], providers: {}, completed_providers: [], error: error.message };
      }
    })
  );

  const sources = mergeDeepResults(
    settled.flatMap(result => Array.isArray(result?.sources) ? result.sources : []),
    Math.max(30, perQueryLimit * 3)
  );

  const evidence = verifyCrossSourceEvidence(sources, { minChars: 50 });
  const evidenceRank = new Map(
    (evidence.ranked_sources || []).map(item => [
      sourceIdentity(item),
      item
    ])
  );

  const safeSources = filterSearchResults(sources, 'public').accepted;
  const ranked = safeSources
    .map(item => {
      const verification = evidenceRank.get(sourceIdentity(item));
      return {
        ...item,
        verification_score: verification?.cross_source_score ?? null,
        cross_source_status: verification?.verification_status || 'single_source',
        supporting_sources: verification?.supporting_sources || 0,
        conflicting_sources: verification?.conflicting_sources || 0
      };
    })
    .sort((a, b) => {
      const score = Number(b.verification_score || 0) - Number(a.verification_score || 0);
      if (score) return score;
      return Number(b.relevance_score || 0) - Number(a.relevance_score || 0);
    });

  const providerFlags = {};
  for (const result of settled) {
    for (const [provider, connected] of Object.entries(result?.providers || {})) {
      providerFlags[provider] = providerFlags[provider] || Boolean(connected);
    }
  }

  return {
    success: ranked.length > 0,
    variants,
    sources: ranked,
    providers: providerFlags,
    completed_providers: [...new Set(settled.flatMap(result => result?.completed_providers || []))],
    evidence_summary: buildEvidenceSummary(evidence),
    quality: buildSearchQuality(ranked, 'public')
  };
}

function loadAuthorizedJson(name, fallback = []) {
  const inline = String(process.env[name] || '').trim();
  if (inline) {
    try {
      const parsed = JSON.parse(inline);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.warn(`Dream authorized ${name} data is not valid JSON:`, error.message);
    }
  }
  return fallback;
}

function loadAuthorizedCorpus() {
  const inlineCorpus = loadAuthorizedJson('DREAM_AUTHORIZED_SEARCH_DATA');
  if (inlineCorpus.length) return inlineCorpus;

  const configuredPath = String(process.env.DREAM_AUTHORIZED_SEARCH_FILE || '').trim();
  if (!configuredPath) return [];

  try {
    const absolute = path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Dream authorized search corpus unavailable:', error.message);
    return [];
  }
}

function loadAuthorizedOverrides() {
  const configuredPath = String(process.env.DREAM_AUTHORIZED_SEARCH_OVERRIDES_FILE || '').trim();
  if (configuredPath) {
    try {
      const absolute = path.isAbsolute(configuredPath)
        ? configuredPath
        : path.join(process.cwd(), configuredPath);
      const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('Dream authorized search overrides unavailable:', error.message);
    }
  }
  return loadAuthorizedJson('DREAM_AUTHORIZED_SEARCH_OVERRIDES');
}

function scorePrivateItem(item, query) {
  const normalized = normalizeQuery(query).toLowerCase();
  const title = String(item?.title || item?.name || '').toLowerCase();
  const aliases = [
    ...(Array.isArray(item?.aliases) ? item.aliases : []),
    ...(Array.isArray(item?.keywords) ? item.keywords : []),
    ...(Array.isArray(item?.tags) ? item.tags : [])
  ].map(value => String(value || '').toLowerCase());

  const haystack = [
    item?.title, item?.name, item?.content, item?.text, item?.description,
    item?.answer, item?.summary, ...aliases
  ].filter(Boolean).join(' ').toLowerCase();

  const tokens = normalized.split(/[^a-z0-9@.+_-]+/).filter(token => token.length > 1);
  let score = 0;

  if (normalized && title.includes(normalized)) score += 40;
  if (normalized && haystack.includes(normalized)) score += 20;

  for (const token of tokens) {
    if (title.includes(token)) score += 6;
    else if (haystack.includes(token)) score += 2;
    if (aliases.some(alias => alias === token || alias.includes(token))) score += 3;
  }

  const configuredQueries = [
    item?.query,
    ...(Array.isArray(item?.queries) ? item.queries : [])
  ].map(value => normalizeQuery(value).toLowerCase()).filter(Boolean);

  if (configuredQueries.some(value => value === normalized)) score += 100;
  if (configuredQueries.some(value => normalized.includes(value) || value.includes(normalized))) score += 50;

  return score;
}

function searchAuthorizedCorpus(query, limit = 8) {
  const overrides = loadAuthorizedOverrides();
  const corpus = [...overrides.map(item => ({ ...item, _authorized_override: true })), ...loadAuthorizedCorpus()];
  return corpus
    .map((item, index) => ({ item, index, score: scorePrivateItem(item, query) + (item?._authorized_override ? 1000 : 0) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Number(limit) || 8, 20))
    .map(({ item, index, score }) => ({
      title: String(item?.title || item?.name || 'Authorized record ' + (index + 1)).trim(),
      source: String(item?.source || 'Authorized data').trim(),
      type: String(item?.type || 'authorized').trim(),
      excerpt: String(
        item?.answer ||
        item?.content ||
        item?.text ||
        item?.description ||
        item?.summary ||
        JSON.stringify(item)
      ).trim().slice(0, 5000),
      match_score: score,
      private: true,
      authorized: true,
      authoritative: Boolean(item?._authorized_override || item?.authoritative),
      precedence: item?._authorized_override || item?.authoritative
        ? 'owner-authoritative'
        : 'authorized-source',
      target_title: String(item?.target_title || '').trim() || null,
      target_provider: String(item?.target_provider || '').trim() || null,
      target_source: String(item?.target_source || '').trim() || null,
      connector_id: String(item?.connector_id || '').trim() || null,
      access_scope: String(item?.access_scope || 'owner-authorized').trim(),
      evidence: Array.isArray(item?.evidence)
        ? item.evidence.slice(0, 8)
        : [{
            type: 'text',
            content: String(
              item?.answer ||
              item?.content ||
              item?.text ||
              item?.description ||
              item?.summary ||
              ''
            ).trim().slice(0, 3000),
            source: String(item?.source || 'Authorized data').trim()
          }],
      media: Array.isArray(item?.media)
        ? item.media.slice(0, 8)
        : []
    }));
}

async function deepAuthorizedRetrieval(query, limit = 8) {
  const variants = buildDeepQueryVariants(query);
  const perQueryLimit = Math.min(Math.max(Number(limit) || 8, 5), 12);

  const settled = await Promise.all(
    variants.map(async variant => {
      const [corpus, connectors] = await Promise.all([
        Promise.resolve(searchAuthorizedCorpus(variant, perQueryLimit)),
        searchAuthorizedSources(variant, perQueryLimit)
      ]);

      return {
        variant,
        corpus: Array.isArray(corpus) ? corpus : [],
        connectors: connectors || { results: [], configured: false, connectors: [] }
      };
    })
  );

  const authorized = mergeDeepResults(
    settled.flatMap(item => [
      ...item.corpus,
      ...(item.connectors.results || [])
    ]),
    50
  );

  const evidence = verifyCrossSourceEvidence(
    authorized.map(item => ({
      ...item,
      extract: item.extract || item.excerpt || item.content || '',
      source_type: item.source_type || (item.authoritative ? 'official' : 'reference')
    })),
    { minChars: 30 }
  );

  const evidenceMap = new Map(
    (evidence.ranked_sources || []).map(item => [
      sourceIdentity(item),
      item
    ])
  );

  const ranked = authorized
    .map(item => {
      const verification = evidenceMap.get(sourceIdentity(item));
      return {
        ...item,
        verification_score: verification?.cross_source_score ?? null,
        cross_source_status: verification?.verification_status || 'single_source',
        supporting_sources: verification?.supporting_sources || 0,
        conflicting_sources: verification?.conflicting_sources || 0,
        evidence: Array.isArray(item.evidence) && item.evidence.length
          ? item.evidence.slice(0, 8)
          : [{
              type: 'text',
              content: String(item.excerpt || item.extract || item.content || '').slice(0, 3000),
              source: String(item.source || item.provider || 'Authorized source')
            }]
      };
    })
    .sort((a, b) => {
      const authority = Number(Boolean(b.authoritative)) - Number(Boolean(a.authoritative));
      if (authority) return authority;
      return Number(b.verification_score || 0) - Number(a.verification_score || 0);
    });

  return {
    variants,
    results: ranked,
    evidence_summary: buildEvidenceSummary(evidence),
    connectors: [...new Set(settled.flatMap(item => item.connectors.connectors || []))],
    successful_connectors: [...new Set(settled.flatMap(item => item.connectors.successful_connectors || []))],
    failed_connectors: [...new Set(settled.flatMap(item => item.connectors.failed_connectors || []))],
    configured: settled.some(item => Boolean(item.connectors.configured))
  };
}

function mergeAuthorizedWithPublic(publicResults, authorizedResults) {
  const publicItems = Array.isArray(publicResults) ? publicResults : [];
  const authorizedItems = Array.isArray(authorizedResults) ? authorizedResults : [];

  // Owner-authorized records are the highest-precedence knowledge layer. When an
  // override targets a public result by title/provider/source, it replaces that
  // result's displayed answer while the original public evidence remains available
  // in the returned public_results for cross-checking.
  const remainingPublic = publicItems.filter(publicItem => {
    return !authorizedItems.some(authItem => {
      if (!authItem?.authoritative) return false;
      const targetTitle = String(authItem?.target_title || '').trim().toLowerCase();
      const targetProvider = String(authItem?.target_provider || '').trim().toLowerCase();
      const targetSource = String(authItem?.target_source || '').trim().toLowerCase();
      const title = String(publicItem?.title || '').trim().toLowerCase();
      const provider = String(publicItem?.provider || '').trim().toLowerCase();
      const source = String(publicItem?.source || '').trim().toLowerCase();

      return (targetTitle && targetTitle === title) ||
        (targetProvider && targetProvider === provider) ||
        (targetSource && targetSource === source);
    });
  });

  return [...authorizedItems, ...remainingPublic];
}

async function publicSearch(query, limit = 8) {
  const normalized = normalizeQuery(query);
  if (!normalized) return { success: false, error: 'A search request is required.' };

  const result = await deepPublicSearch(normalized, Math.min(Number(limit) || 8, 12));
  let sources = Array.isArray(result?.sources) ? result.sources : [];

  const needsFallback = !sources.length || !sources.some(item =>
    String(item?.provider || '').toLowerCase() === 'wikipedia' ||
    String(item?.extract || item?.snippet || '').trim().length >= 80
  );

  if (needsFallback) {
    const fallbackResults = await Promise.all([
      Promise.race([
        searchWikipedia(normalized, Math.min(Number(limit) || 8, 6)),
        new Promise(resolve => setTimeout(() => resolve([]), 2500))
      ]),
      Promise.race([
        searchDuckDuckGo(normalized, Math.min(Number(limit) || 8, 6)),
        new Promise(resolve => setTimeout(() => resolve([]), 2500))
      ])
    ]);

    const fallbackSources = fallbackResults.flat().filter(item =>
      String(item?.extract || item?.snippet || '').trim().length >= 30
    );
    sources = mergeDeepResults([...sources, ...fallbackSources], 20);
  }

  const wikipedia = sources.find(item => String(item?.provider || '').toLowerCase() === 'wikipedia');
  if (wikipedia?.title) {
    try {
      const page = await Promise.race([
        getWikipediaPage(wikipedia.title),
        new Promise(resolve => setTimeout(() => resolve(null), 1800))
      ]);
      if (page?.extract) {
        sources = [
          { ...wikipedia, extract: page.extract, content_length: page.extract.length },
          ...sources.filter(item => item !== wikipedia)
        ];
      }
    } catch (_) {}
  }

  return {
    success: sources.length > 0,
    mode: 'public',
    query: normalized,
    query_variants: result?.variants || [normalized],
    results: sources.map(publicResult),
    providers: result?.providers || {},
    completed_providers: result?.completed_providers || [],
    evidence_summary: result?.evidence_summary || null,
    retrieval_time_ms: null,
    message: sources.length
      ? 'Public information found and cross-source evidence was evaluated.'
      : 'No public information was found in the connected sources.'
  };
}


function registerDreamSearchRoutes(app, options = {}) {
  const getAuthenticatedAccount = options.getAuthenticatedAccount;
  const isOwnerAccount = options.isOwnerAccount;
  const searchPublic = options.searchPublic || publicSearch;

  async function requireOwner(req) {
    if (typeof getAuthenticatedAccount !== 'function' || typeof isOwnerAccount !== 'function') {
      return { success: false, status: 503, error: 'Authorized Search owner protection is not configured.' };
    }

    if (!String(req.headers.authorization || '')) {
      return { success: false, status: 401, error: 'Owner sign-in is required for Authorized Search.' };
    }

    const auth = await getAuthenticatedAccount(req);
    if (!auth.success) return auth;

    if (!isOwnerAccount(auth.account)) {
      return { success: false, status: 403, error: 'Authorized Search is restricted to the Dream Education owner.' };
    }

    return auth;
  }

  app.post('/api/dream-search/public', async (req, res) => {
    try {
      const result = await searchPublic(req.body?.query, req.body?.limit);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Dream public search error:', error);
      return res.status(500).json({ success: false, error: 'Public search is temporarily unavailable.' });
    }
  });

  app.post('/api/dream-search/authorized', async (req, res) => {
    const owner = await requireOwner(req);
    if (!owner.success) {
      return res.status(owner.status || 401).json({ success: false, error: owner.error });
    }

    try {
      const query = normalizeQuery(req.body?.query);
      if (!query) {
        return res.status(400).json({ success: false, error: 'A search request is required.' });
      }

      const [publicResult, authorizedDeep] = await Promise.all([
        searchPublic(query, req.body?.limit),
        deepAuthorizedRetrieval(query, req.body?.limit)
      ]);

      const connectorResult = {
        configured: authorizedDeep.configured,
        connectors: authorizedDeep.connectors,
        successful_connectors: authorizedDeep.successful_connectors,
        failed_connectors: authorizedDeep.failed_connectors
      };

      const authorizedResults = filterSearchResults(authorizedDeep.results || [], 'authorized').accepted
        .filter(item => String(item?.excerpt || item?.content || item?.extract || '').trim().length > 0);

      const mergedResults = mergeAuthorizedWithPublic(publicResult.results, authorizedResults)
        .filter((item, index, all) => {
          const key = [
            String(item?.title || '').trim().toLowerCase(),
            String(item?.provider || item?.source || '').trim().toLowerCase(),
            String(item?.excerpt || '').trim().slice(0, 160).toLowerCase()
          ].join('|');
          return all.findIndex(candidate => [
            String(candidate?.title || '').trim().toLowerCase(),
            String(candidate?.provider || candidate?.source || '').trim().toLowerCase(),
            String(candidate?.excerpt || '').trim().slice(0, 160).toLowerCase()
          ].join('|') === key) === index;
        })
        .slice(0, 30);

      return res.json({
        success: true,
        mode: 'authorized',
        query,
        authorized_results: authorizedResults,
        results: mergedResults,
        // Never create a separate public-source path for Authorized Search: reuse the exact
        // public result set so the owner sees everything Public Search can see, plus authorized data.
        public_results: Array.isArray(publicResult.results) ? publicResult.results : [],
        private_results: authorizedResults,
        private_data_configured: loadAuthorizedCorpus().length > 0 || Boolean(connectorResult?.configured),
        owner_overrides_configured: loadAuthorizedOverrides().length > 0,
        authorized_connectors: connectorResult?.connectors || [],
        authorized_query_variants: authorizedDeep.variants || [query],
        authorized_evidence_summary: authorizedDeep.evidence_summary || null,
        search_quality: buildSearchQuality(mergedResults, 'authorized'),
        successful_authorized_connectors: connectorResult?.successful_connectors || [],
        failed_authorized_connectors: connectorResult?.failed_connectors || [],
        search_scope: 'all-connected-public-sources-plus-owner-authorized-sources',
        answer_precedence: 'owner-authorized overrides > other authorized sources > connected public sources',
        source_policy: 'Public Search may use only public sources. Authorized Search may use all connected public sources plus owner-authorized sources.',
        precedence: 'Owner-authorized overrides are authoritative for the owner search; other authorized records come next; the complete connected public-source result set remains available for cross-checking.',
        connected_source_count: Object.values(publicResult.providers || {}).filter(Boolean).length,
        result_count: mergedResults.length,
        authorized_result_count: authorizedResults.length,
        retrieval_cap: 30,
        owner_authority: 'highest application-level knowledge precedence within explicitly authorized sources',
        connected_providers: Object.entries(publicResult.providers || {}).filter(([, connected]) => connected).map(([provider]) => provider),
        message: authorizedResults.length
          ? 'Authorized information found. Public evidence is included for cross-checking.'
          : 'No matching authorized records were found. Public information is included.'
      });
    } catch (error) {
      console.error('Dream authorized search error:', error);
      return res.status(500).json({ success: false, error: 'Authorized search is temporarily unavailable.' });
    }
  });
}

module.exports = {
  registerDreamSearchRoutes,
  publicSearch,
  searchAuthorizedCorpus,
  normalizeQuery
};
