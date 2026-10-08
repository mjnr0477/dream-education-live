'use strict';

const assert = require('assert');
const http = require('http');

let requests = 0;
const server = http.createServer((req, res) => {
  requests += 1;
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const payload = req.method === 'POST' ? JSON.parse(body || '{}') : null;
    const page = Number(new URL(req.url, 'http://127.0.0.1').searchParams.get('page') || 1);
    const rows = page <= 2 ? [{ title: `Authorized deep result ${page}`, answer: `Deep authorized evidence page ${page}`, image: { url: 'https://example.com/evidence.jpg' } }] : [];
    if (req.method === 'POST' && payload.query !== 'deep owner query') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'query mismatch' }));
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ results: rows }));
  });
});

(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    process.env.DREAM_AUTHORIZED_SOURCE_CONNECTORS = JSON.stringify([
      {
        id: 'post-owner-index',
        name: 'Owner Authorized Index',
        endpoint: `http://127.0.0.1:${port}/search`,
        method: 'POST',
        query_param: 'query',
        body_template: { query: '{{query}}', page: '{{page}}', limit: '{{limit}}' },
        response_path: 'results',
        title_path: 'title',
        content_path: 'answer',
        media_path: 'image',
        page_size: 1,
        max_pages: 3,
        private: true,
        authoritative: true
      }
    ]);

    const { searchAuthorizedSources } = require('../product/authorized_source_engine');
    const result = await searchAuthorizedSources('deep owner query', 10);

    assert.strictEqual(result.configured, true);
    assert.deepStrictEqual(result.successful_connectors, ['post-owner-index']);
    assert.strictEqual(result.results.length, 2);
    assert.ok(result.results.every(item => item.authorized === true));
    assert.ok(result.results.every(item => item.authoritative === true));
    assert.ok(result.results.every(item => item.excerpt.includes('Deep authorized evidence')));
    assert.ok(result.results.some(item => item.media.some(media => media.type === 'image')));
    assert.ok(requests >= 3);

    console.log('AUTHORIZED MAXIMUM LEGITIMATE RETRIEVAL SMOKE TEST: PASS');
  } finally {
    delete process.env.DREAM_AUTHORIZED_SOURCE_CONNECTORS;
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});