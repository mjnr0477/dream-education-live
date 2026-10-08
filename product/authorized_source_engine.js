'use strict';

const https = require('https');
const http = require('http');
const net = require('net');

const DEFAULT_TIMEOUT = 4500;
const MAX_TIMEOUT = 15000;
const MAX_PAGES = 10;

function loadConnectors() {
  const raw = String(process.env.DREAM_AUTHORIZED_SOURCE_CONNECTORS || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        ...item,
        enabled: item.enabled !== false,
        private: item.private !== false,
        authoritative: item.authoritative === true,
        access_scope: String(item.access_scope || 'owner-authorized').trim()
      }))
      .filter(item => item.enabled && item.endpoint);
  } catch (error) {
    console.warn('Dream authorized source connectors are not valid JSON:', error.message);
    return [];
  }
}

function resolveHeaderValue(value) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^env:([A-Za-z_][A-Za-z0-9_]*)$/);
  return match ? String(process.env[match[1]] || '') : value;
}

function resolveHeaders(headers) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return {};
  return Object.fromEntries(
    Object.entries(headers)
      .map(([key, value]) => [key, resolveHeaderValue(value)])
      .filter(([key, value]) => key && String(value || '').length > 0)
  );
}

function isBlockedHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }

  if (net.isIP(host)) {
    if (host === '127.0.0.1' || host === '::1' || host.startsWith('10.') ||
        host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
        host.startsWith('169.254.')) {
      return true;
    }
  }

  return false;
}

function readPath(value, pathExpression) {
  if (!pathExpression) return value;
  return String(pathExpression)
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => current == null ? undefined : current[key], value);
}

function requestJson(urlString, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const requestBody = options.body == null ? null : (
    typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  );
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlString);
    } catch (_) {
      reject(new Error('Invalid authorized source URL.'));
      return;
    }

    if (!['https:', 'http:'].includes(parsed.protocol) || isBlockedHostname(parsed.hostname)) {
      reject(new Error('Authorized source URL is not allowed.'));
      return;
    }

    const transport = parsed.protocol === 'https:' ? https : http;
    const requestOptions = {
      method,
      headers: Object.assign({
        'User-Agent': 'DreamEducation/1.0 authorized-search',
        'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8'
      }, options.headers || {})
    };
    if (requestBody != null) {
      requestOptions.headers['Content-Type'] = requestOptions.headers['Content-Type'] || 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(requestBody);
    }

    const request = transport.request(parsed, requestOptions, response => {
      let body = '';
      if (typeof response.setEncoding === 'function') response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode || 'unknown'}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (_) {
          resolve({ text: body });
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(Math.min(Math.max(Number(options.timeout) || DEFAULT_TIMEOUT, 250), MAX_TIMEOUT), () => {
      request.destroy(new Error('Authorized source request timed out.'));
    });
    if (requestBody != null) request.write(requestBody);
    request.end();
  });
}

function resolveTemplate(value, query, page, limit) {
  if (typeof value === 'string') return value.replace(/\\{\\{query\\}\\}/g, query).replace(/\\{\\{page\\}\\}/g, String(page)).replace(/\\{\\{limit\\}\\}/g, String(limit));
  if (Array.isArray(value)) return value.map(item => resolveTemplate(item, query, page, limit));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTemplate(item, query, page, limit)]));
  return value;
}

function buildRequest(connector, query, page, pageSize) {
  const method = String(connector.method || 'GET').toUpperCase();
  const url = new URL(String(connector.endpoint || '').trim());
  const queryParam = String(connector.query_param || 'q').trim();
  if (method === 'GET' || method === 'HEAD') {
    if (queryParam) url.searchParams.set(queryParam, query);
    if (connector.limit_param) url.searchParams.set(String(connector.limit_param), String(pageSize));
    if (connector.page_param) url.searchParams.set(String(connector.page_param), String(page));
    if (connector.offset_param) url.searchParams.set(String(connector.offset_param), String((page - 1) * pageSize));
    if (connector.extra_query && typeof connector.extra_query === 'object') {
      for (const [key, value] of Object.entries(resolveTemplate(connector.extra_query, query, page, pageSize))) url.searchParams.set(key, String(value));
    }
    return { url: url.toString(), method, body: null };
  }
  if (connector.query_param) {
    // POST/PUT/PATCH connectors may place the query in a JSON body via body_template.
    return { url: url.toString(), method, body: resolveTemplate(connector.body_template || { [queryParam]: query }, query, page, pageSize) };
  }
  return { url: url.toString(), method, body: resolveTemplate(connector.body_template || { query }, query, page, pageSize) };
}

function normalizeRows(data, connector) {
  const rows = readPath(data, connector.response_path || 'results');
  if (Array.isArray(rows)) return rows;
  if (rows && typeof rows === 'object') return Object.values(rows);
  return [];
}

function buildQueryUrl(connector, query) {
  const endpoint = String(connector.endpoint || '').trim();
  if (!endpoint) return null;

  const url = new URL(endpoint);
  const queryParam = String(connector.query_param || 'q').trim();

  if (queryParam) {
    url.searchParams.set(queryParam, query);
  }

  if (connector.limit_param) {
    url.searchParams.set(String(connector.limit_param), String(connector.limit || 8));
  }

  if (connector.page_param) {
    url.searchParams.set(String(connector.page_param), String(connector.page || 1));
  }

  if (connector.offset_param) {
    const pageSize = Number(connector.page_size || connector.limit || 8);
    const page = Math.max(1, Number(connector.page || 1));
    url.searchParams.set(String(connector.offset_param), String((page - 1) * pageSize));
  }

  return url.toString();
}

function normalizeMedia(row, connector) {
  const candidates = [
    ['media', readPath(row, connector.media_path || '')],
    ['media', readPath(row, 'media')],
    ['evidence', readPath(row, 'evidence')],
    ['attachment', readPath(row, 'attachments')],
    ['image', readPath(row, 'image')],
    ['image', readPath(row, 'images')],
    ['image', readPath(row, 'photo')],
    ['image', readPath(row, 'photos')],
    ['video', readPath(row, 'video')],
    ['video', readPath(row, 'videos')],
    ['audio', readPath(row, 'audio')],
    ['audio', readPath(row, 'audio_url')],
    ['document', readPath(row, 'document')],
    ['document', readPath(row, 'documents')]
  ].filter(([, value]) => Boolean(value));

  const values = candidates.flatMap(([hint, value]) => {
    const items = Array.isArray(value) ? value : [value];
    return items.map(item => ({ hint, item }));
  });

  return values.map(({ hint, item }) => {
    if (typeof item === 'string') return { type: hint, url: item };
    if (!item || typeof item !== 'object') return null;
    const url = item.url || item.uri || item.src || item.content_url || item.embed_url;
    if (!url) return null;
    const rawType = String(item.type || item.mime_type || hint || 'media').toLowerCase();
    const type = rawType.includes('image') ? 'image'
      : rawType.includes('video') ? 'video'
      : rawType.includes('audio') ? 'audio'
      : rawType.includes('pdf') || rawType.includes('document') ? 'document'
      : hint;
    return {
      type,
      url: String(url),
      title: String(item.title || item.name || '').trim() || null,
      description: String(item.description || item.caption || '').trim() || null
    };
  }).filter(item => item && /^https?:\/\//i.test(item.url)).slice(0, 8);
}
function normalizeEvidence(row, connector, title, content, source) {
  const raw = [
    readPath(row, connector.evidence_path || ''),
    readPath(row, 'evidence')
  ].filter(Boolean).flatMap(value => Array.isArray(value) ? value : [value]);
  const evidence = raw.map(item => {
    if (typeof item === 'string') return { type: 'text', content: item, source };
    if (!item || typeof item !== 'object') return null;
    const text = item.content || item.text || item.description || item.snippet;
    if (text) return { type: 'text', content: String(text).slice(0, 4000), source: String(item.source || source) };
    return null;
  }).filter(Boolean).slice(0, 8);

  if (!evidence.length && content) {
    evidence.push({ type: 'text', content: String(content).slice(0, 3000), source });
  }
  return evidence;
}

function normalizeRow(row, connector, index) {
  const title = readPath(row, connector.title_path || 'title') ||
    readPath(row, 'name') ||
    `Authorized result ${index + 1}`;

  const content = readPath(row, connector.content_path || 'content') ||
    readPath(row, 'text') ||
    readPath(row, 'description') ||
    readPath(row, 'snippet') ||
    readPath(row, 'answer') ||
    readPath(row, 'summary') ||
    '';

  const source = String(connector.name || connector.id || 'Authorized source').trim();
  const evidence = normalizeEvidence(row, connector, String(title).trim(), content, source);
  const media = normalizeMedia(row, connector);

  return {
    title: String(title).trim(),
    source,
    provider: String(connector.id || source).trim(),
    type: String(connector.type || 'authorized'),
    excerpt: String(content).trim().slice(0, 5000),
    evidence,
    media,
    private: connector.private !== false,
    authorized: true,
    authoritative: Boolean(connector.authoritative),
    precedence: connector.authoritative ? 'owner-authoritative' : 'authorized-source',
    connector_id: String(connector.id || '').trim() || null,
    access_scope: String(connector.access_scope || 'owner-authorized').trim()
  };
}

async function searchConnector(connector, query, limit = 8) {
  const pageSize = Math.min(Math.max(Number(connector.page_size || limit) || 8, 1), 20);
  const maxPages = Math.min(Math.max(Number(connector.max_pages || 1) || 1, 1), MAX_PAGES);
  const headers = resolveHeaders(connector.headers);
  const results = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const request = buildRequest({ ...connector, limit: pageSize, page, page_size: pageSize }, query, page, pageSize);
    if (!request?.url) break;

    try {
      const data = await requestJson(request.url, {
        method: request.method,
        body: request.body,
        headers,
        timeout: connector.timeout || DEFAULT_TIMEOUT
      });

      const rows = normalizeRows(data, connector)
        .map((row, index) => normalizeRow(row, connector, results.length + index))
        .filter(row => row.excerpt.length >= 1);

        results.push(...rows);
      if (rows.length < pageSize) break;
    } catch (error) {
      if (!results.length) throw error;
      break;
    }
  }

  return results.slice(0, Math.min(Number(limit) || 8, 200));
}

async function searchAuthorizedSources(query, limit = 8) {
  const connectors = loadConnectors();
  if (!connectors.length) {
    return { results: [], configured: false, connectors: [] };
  }

  const settled = await Promise.all(connectors.map(async connector => {
    try {
      return {
        id: String(connector.id || connector.name || 'authorized-source'),
        results: await searchConnector(connector, query, limit)
      };
    } catch (error) {
      console.warn(
        `Authorized source "${connector.id || connector.name || 'unknown'}" failed:`,
        error.message
      );
      return {
        id: String(connector.id || connector.name || 'authorized-source'),
        results: []
      };
    }
  }));

  const results = settled
    .flatMap(item => item.results)
    .sort((a, b) => {
      const authority = Number(Boolean(b?.authoritative)) - Number(Boolean(a?.authoritative));
      if (authority) return authority;
      return String(a?.source || '').localeCompare(String(b?.source || ''));
    });

  return {
    results,
    configured: true,
    connectors: settled.map(item => item.id),
    successful_connectors: settled.filter(item => item.results.length > 0).map(item => item.id),
    failed_connectors: settled.filter(item => item.results.length === 0).map(item => item.id)
  };
}

module.exports = {
  loadConnectors,
  searchAuthorizedSources
};
