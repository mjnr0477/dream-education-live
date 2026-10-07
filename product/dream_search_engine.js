'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { searchSources, getWikipediaPage } = require('./source_engine');
const { searchAuthorizedSources, loadConnectors } = require('./authorized_source_engine');

function normalizeQuery(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
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
    url: String(item?.url || '').trim() || null
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
  const title = String(item?.title || item?.name || '').toLowerCase();
  const haystack = [
    item?.title, item?.name, item?.content, item?.text, item?.description,
    ...(Array.isArray(item?.tags) ? item.tags : [])
  ].filter(Boolean).join(' ').toLowerCase();

  const normalized = normalizeQuery(query).toLowerCase();
  const tokens = normalized.split(/[^a-z0-9@.+_-]+/).filter(token => token.length > 1);
  let score = 0;

  if (normalized && title.includes(normalized)) score += 20;
  if (normalized && haystack.includes(normalized)) score += 10;

  for (const token of tokens) {
    if (title.includes(token)) score += 4;
    else if (haystack.includes(token)) score += 1;
  }

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
      excerpt: String(item?.content || item?.text || item?.description || JSON.stringify(item)).trim().slice(0, 5000),
      match_score: score,
      private: true,
      authorized: true,
      authoritative: Boolean(item?._authorized_override),
      precedence: item?._authorized_override ? 'owner-authoritative' : 'authorized-source'
    }));
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

  const result = await searchSources(normalized, Math.min(Number(limit) || 8, 12));
  const sources = Array.isArray(result?.sources) ? result.sources : [];
  let expanded = sources;

  const wikipedia = sources.find(item => String(item?.provider || '').toLowerCase() === 'wikipedia');
  if (wikipedia?.title) {
    try {
      const page = await Promise.race([
        getWikipediaPage(wikipedia.title),
        new Promise(resolve => setTimeout(() => resolve(null), 1800))
      ]);
      if (page?.extract) expanded = [{ ...wikipedia, extract: page.extract }, ...sources.filter(item => item !== wikipedia)];
    } catch (_) {}
  }

  return {
    success: expanded.length > 0,
    mode: 'public',
    query: normalized,
    // Public Search is the canonical public-source layer. Authorized Search calls this same layer,
    // so every public result available to the connected source mesh is eligible in both modes.
    results: expanded.map(publicResult),
    providers: result?.providers || {},
    completed_providers: result?.completed_providers || [],
    retrieval_time_ms: result?.retrieval_time_ms || null,
    message: expanded.length ? 'Public information found.' : 'No public information was found in the connected sources.'
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

      const [publicResult, privateResults] = await Promise.all([
        searchPublic(query, req.body?.limit),
        Promise.resolve(searchAuthorizedCorpus(query, req.body?.limit))
      ]);

      return res.json({
        success: true,
        mode: 'authorized',
        query,
        authorized_results: privateResults,
        results: mergeAuthorizedWithPublic(publicResult.results, privateResults),
        // Never create a separate public-source path for Authorized Search: reuse the exact
        // public result set so the owner sees everything Public Search can see, plus authorized data.
        public_results: Array.isArray(publicResult.results) ? publicResult.results : [],
        private_results: privateResults,
        private_data_configured: loadAuthorizedCorpus().length > 0,
        owner_overrides_configured: loadAuthorizedOverrides().length > 0,
        search_scope: 'all-connected-public-sources-plus-owner-authorized-sources',
        answer_precedence: 'owner-authorized overrides > other authorized sources > connected public sources',
        source_policy: 'Public Search may use only public sources. Authorized Search may use all connected public sources plus owner-authorized sources.',
        precedence: 'Owner-authorized overrides are authoritative for the owner search; other authorized records come next; the complete connected public-source result set remains available for cross-checking.',
        connected_source_count: Object.values(publicResult.providers || {}).filter(Boolean).length,
        connected_providers: Object.entries(publicResult.providers || {}).filter(([, connected]) => connected).map(([provider]) => provider),
        message: privateResults.length
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
