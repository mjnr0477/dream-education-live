'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { searchSources, getWikipediaPage } = require('./source_engine');

const AUTH_TOKEN_TTL_MS = 30 * 60 * 1000;
const UNLOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_UNLOCK_ATTEMPTS = 5;
const unlockAttempts = new Map();

function configuredPassword() {
  return String(process.env.DREAM_AUTHORIZED_SEARCH_PASSWORD || '').trim();
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function cleanupAttempts() {
  const now = Date.now();
  for (const [key, value] of unlockAttempts.entries()) {
    if (now - value.startedAt >= UNLOCK_WINDOW_MS) unlockAttempts.delete(key);
  }
}

function allowUnlock(key) {
  cleanupAttempts();
  const now = Date.now();
  const current = unlockAttempts.get(key);
  if (!current || now - current.startedAt >= UNLOCK_WINDOW_MS) {
    unlockAttempts.set(key, { startedAt: now, attempts: 1 });
    return true;
  }
  current.attempts += 1;
  return current.attempts <= MAX_UNLOCK_ATTEMPTS;
}

function getClientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();
}

function issueAuthorizedToken() {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(24).toString('hex');
  const payload = issuedAt + '.' + nonce;
  const signature = crypto.createHmac('sha256', configuredPassword()).update(payload).digest('hex');
  return Buffer.from(payload + '.' + signature).toString('base64url');
}

function verifyAuthorizedToken(token) {
  if (!configuredPassword() || !token) return false;
  try {
    const parts = Buffer.from(String(token), 'base64url').toString('utf8').split('.');
    if (parts.length !== 3) return false;
    const issuedAt = Number(parts[0]);
    if (!Number.isFinite(issuedAt) || !parts[1] || !parts[2]) return false;
    if (Date.now() - issuedAt > AUTH_TOKEN_TTL_MS || issuedAt > Date.now() + 30000) return false;
    const payload = issuedAt + '.' + parts[1];
    const expected = crypto.createHmac('sha256', configuredPassword()).update(payload).digest('hex');
    return safeEqual(parts[2], expected);
  } catch (_) {
    return false;
  }
}

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

  async function requireOwner(req) {
    if (typeof getAuthenticatedAccount !== 'function' || typeof isOwnerAccount !== 'function') {
      return { success: false, status: 503, error: 'Authorized Search owner protection is not configured.' };
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
      const result = await publicSearch(req.body?.query, req.body?.limit);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Dream public search error:', error);
      return res.status(500).json({ success: false, error: 'Public search is temporarily unavailable.' });
    }
  });

  app.post('/api/dream-search/authorized/unlock', async (req, res) => {
    const owner = await requireOwner(req);
    if (!owner.success) return res.status(owner.status).json({ success: false, error: owner.error });

    const password = String(req.body?.password || '');
    const configured = configuredPassword();
    if (!configured) return res.status(503).json({ success: false, error: 'Authorized Search is not configured yet.' });

    if (!allowUnlock(getClientKey(req))) {
      return res.status(429).json({ success: false, error: 'Too many unlock attempts. Please try again later.' });
    }

    if (!safeEqual(password, configured)) {
      return res.status(401).json({ success: false, error: 'Authorized Search password is incorrect.' });
    }

    return res.json({
      success: true,
      token: issueAuthorizedToken(),
      expires_in_seconds: Math.floor(AUTH_TOKEN_TTL_MS / 1000)
    });
  });

  app.post('/api/dream-search/authorized', async (req, res) => {
    const owner = await requireOwner(req);
    if (!owner.success) return res.status(owner.status).json({ success: false, error: owner.error });

    const authorization = String(req.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!verifyAuthorizedToken(token)) {
      return res.status(401).json({ success: false, error: 'Authorized Search is locked.' });
    }

    try {
      const query = normalizeQuery(req.body?.query);
      if (!query) return res.status(400).json({ success: false, error: 'A search request is required.' });

      const [publicResult, privateResults] = await Promise.all([
        publicSearch(query, req.body?.limit),
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
  issueAuthorizedToken,
  verifyAuthorizedToken,
  normalizeQuery
};
