'use strict';

const assert = require('assert');
const https = require('https');
const { EventEmitter } = require('events');

let requests = 0;
const originalRequest = https.request;
https.request = (url, options, callback) => {
  requests += 1;
  const response = new EventEmitter();
  response.statusCode = 200;
  process.nextTick(() => {
    callback(response);
    const page = requests <= 2 ? requests : 3;
    const payload = { results: page <= 2 ? [{ title: `Authorized deep result ${page}`, answer: `Deep authorized evidence page ${page}`, image: { url: 'https://example.com/evidence.jpg' } }] : [] };
    process.nextTick(() => {
      response.emit('data', JSON.stringify(payload));
      response.emit('end');
    });
  });
  const req = new EventEmitter();
  req.setTimeout = () => {};
  req.write = value => { req.body = String(value); };
  req.end = () => {};
  req.destroy = () => {};
  return req;
};

(async () => {
  try {
    process.env.DREAM_AUTHORIZED_SOURCE_CONNECTORS = JSON.stringify([
      {
        id: 'post-owner-index',
        name: 'Owner Authorized Index',
        endpoint: 'https://authorized.test/search',
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
    https.request = originalRequest;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});