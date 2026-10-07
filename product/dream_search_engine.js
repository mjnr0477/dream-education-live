'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { searchSources, getWikipediaPage } = require('./source_engine');

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
    cross_source_status: String(item?.cross_source_status || '').trim() || null
  };
}

function loadAuthorizedCorpus() {
  const inline = String(process.env.DREAM_AUTHORIZED_SEARCH_DATA || '').trim();
  if (inline) {
    try {
      const parsed = JSON.parse(inline);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Dream authorized search data is not valid JSON:', error.message);
    }
  }

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

function scorePrivateItem(item, query) {
  const haystack = [
    item?.title, item?.name, item?.content, item?.text, item?.description,
    ...(Array.isArray(item?.tags) ? item.tags : [])
  ].filter(Boolean).join(' ').toLowerCase();

  const tokens = normalizeQuery(query).toLowerCase().split(/[^a-z0-9@.+_-]+/).filter(token => token.length > 1);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function searchAuthorizedCorpus(query, limit = 8) {
  return loadAuthorizedCorpus()
    .map((item, index) => ({ item, index, score: scorePrivateItem(item, query) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Number(limit) || 8, 20))
    .map(({ item, index, score }) => ({
      title: String(item?.title || item?.name || 'Authorized record ' + (index + 1)).trim(),
      source: String(item?.source || 'Authorized data').trim(),
      type: String(item?.type || 'authorized').trim(),
      excerpt: String(item?.content || item?.text || item?.description || JSON.stringify(item)).trim().slice(0, 5000),
      match_score: score,
      private: true
    }));
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
    results: expanded.slice(0, 12).map(publicResult),
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
        public_results: publicResult.results || [],
        private_results: privateResults,
        private_data_configured: loadAuthorizedCorpus().length > 0,
        message: privateResults.length
          ? 'Authorized results found.'
          : 'No matching authorized private records were found. Public results are included.'
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
