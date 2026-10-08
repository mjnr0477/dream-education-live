'use strict';

const { URL } = require('url');

const MAX_RESPONSE_BYTES = 1024 * 1024;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function normalizeSiteUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) throw new Error('Only HTTP and HTTPS sites are supported.');
  url.hash = '';
  url.username = '';
  url.password = '';
  return url;
}

function isPrivateHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (host.endsWith('.internal') || host.endsWith('.local')) return true;
  return false;
}

function assertPublicSite(url) {
  if (isPrivateHostname(url.hostname)) throw new Error('Private or local network targets are not allowed.');
  return url;
}

async function fetchBounded(url, options = {}) {
  const target = assertPublicSite(normalizeSiteUrl(url));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(Number(options.timeout_ms) || 8000, 10000));
  try {
    const response = await fetch(target, {
      method: options.method || 'GET',
      headers: { 'Accept': options.accept || 'application/json, text/plain;q=0.9, */*;q=0.1', ...(options.headers || {}) },
      redirect: 'manual',
      signal: controller.signal
    });
    const location = response.headers.get('location');
    if (location) {
      const redirected = assertPublicSite(new URL(location, target));
      if (redirected.hostname !== target.hostname) throw new Error('Cross-site redirects are not followed.');
    }
    const reader = response.body?.getReader();
    if (!reader) return { response, text: await response.text() };
    const chunks = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('Site discovery response is too large.');
      }
      chunks.push(Buffer.from(value));
    }
    return { response, text: Buffer.concat(chunks).toString('utf8') };
  } finally {
    clearTimeout(timer);
  }
}

function extractApiLinks(html, baseUrl) {
  const links = [];
  const pattern = /<(?:link|a)[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = pattern.exec(html || '')) && links.length < 30) {
    const href = match[1];
    const relMatch = match[0].match(/rel=["']([^"']+)["']/i);
    const typeMatch = match[0].match(/type=["']([^"']+)["']/i);
    const rel = String(relMatch?.[1] || '').toLowerCase();
    const type = String(typeMatch?.[1] || '').toLowerCase();
    if (rel.includes('api-catalog') || rel.includes('api') || type.includes('openapi') || /openapi|swagger|api-catalog/i.test(href)) {
      try {
        const url = new URL(href, baseUrl);
        if (ALLOWED_PROTOCOLS.has(url.protocol) && url.hostname === baseUrl.hostname) {
          links.push({ url: url.toString(), rel, type });
        }
      } catch {}
    }
  }
  return [...new Map(links.map(item => [item.url, item])).values()];
}

async function discoverSiteApis(site) {
  const base = assertPublicSite(normalizeSiteUrl(site));
  const candidates = [
    new URL('/.well-known/api-catalog', base).toString(),
    new URL('/openapi.json', base).toString(),
    new URL('/swagger.json', base).toString(),
    new URL('/api/openapi.json', base).toString()
  ];

  const homepage = await fetchBounded(base.toString(), { accept: 'text/html, application/json;q=0.9' });
  const discoveredLinks = extractApiLinks(homepage.text, base);
  const urls = [...new Set([...candidates, ...discoveredLinks.map(x => x.url)])];
  const results = [];

  for (const candidate of urls.slice(0, 12)) {
    try {
      const result = await fetchBounded(candidate, { accept: 'application/json, text/plain;q=0.8' });
      if (!result.response.ok) continue;
      let parsed = null;
      try { parsed = JSON.parse(result.text); } catch {}
      results.push({
        url: candidate,
        status: result.response.status,
        content_type: result.response.headers.get('content-type') || '',
        openapi: Boolean(parsed?.openapi || parsed?.swagger),
        api_catalog: Boolean(candidate.includes('/.well-known/api-catalog') || parsed?.api_catalog),
        document: parsed
      });
    } catch {}
  }

  return {
    site: base.origin,
    discovered: results.map(({ document, ...item }) => ({
      ...item,
      title: document?.info?.title || document?.title || null,
      description: document?.info?.description || document?.description || null,
      endpoints: Array.isArray(document?.apis) ? document.apis.slice(0, 50) : Object.keys(document?.paths || {}).slice(0, 50)
    }))
  };
}

function buildSiteConnector({ endpoint, token, platform = 'website', channel = 'website_contact' }) {
  const target = assertPublicSite(normalizeSiteUrl(endpoint));
  return {
    id: 'site_' + target.hostname.replace(/[^a-z0-9]+/gi, '_').toLowerCase(),
    name: target.hostname,
    platform,
    channels: [{
      type: channel,
      platform,
      enabled: true,
      authorized: Boolean(token),
      send: async ({ body, recipient, message_id, channel: selected }) => {
        if (!token) return { success: false, status: 401, data: { error: 'An authorized site/API token is required.' } };
        const response = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ message_id, body, recipient, channel: selected.type })
        });
        const data = await response.json().catch(() => ({}));
        return { success: response.ok && data.success !== false, status: response.status, data };
      }
    }]
  };
}

module.exports = { normalizeSiteUrl, assertPublicSite, discoverSiteApis, buildSiteConnector };
