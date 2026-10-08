'use strict';

const assert = require('assert');
const https = require('https');
const { EventEmitter } = require('events');

const originalGet = https.get;

function fakeResponse(payload, statusCode = 200) {
  const response = new EventEmitter();
  response.statusCode = statusCode;
  process.nextTick(() => {
    response.emit('data', JSON.stringify(payload));
    response.emit('end');
  });
  return response;
}

https.get = (url, options, callback) => {
  const target = String(url);
  let payload = {};

  if (target.includes('en.wikipedia.org') && target.includes('list=search')) {
    payload = {
      query: {
        search: [{
          title: 'Photosynthesis',
          snippet: 'Photosynthesis is a process used by plants.'
        }]
      }
    };
  } else if (target.includes('en.wikipedia.org') && target.includes('prop=extracts')) {
    payload = {
      query: {
        pages: {
          '123': {
            title: 'Photosynthesis',
            extract: 'Photosynthesis is the process by which green plants, algae, and some bacteria use light energy to convert carbon dioxide and water into chemical energy, producing sugars and releasing oxygen.'
          }
        }
      }
    };
  }

  const response = fakeResponse(payload);
  process.nextTick(() => callback(response));
  return {
    on() { return this; },
    setTimeout() { return this; },
    destroy() {}
  };
};

(async () => {
  try {
    const { publicSearch } = require('../product/dream_search_engine');
    const result = await publicSearch('photosynthesis', 5);

    assert.strictEqual(result.success, true);
    assert.ok(Array.isArray(result.results));
    const wikipedia = result.results.find(item => item.provider === 'wikipedia');
    assert.ok(wikipedia, 'Wikipedia result should survive retrieval filtering.');
    assert.ok(
      wikipedia.excerpt.length >= 80,
      'Public Search should expand a short provider snippet into usable information.'
    );
    assert.ok(
      wikipedia.excerpt.includes('convert carbon dioxide and water'),
      'Expanded public information should be returned to the user.'
    );

    console.log('PUBLIC SEARCH INFORMATION RELIABILITY SMOKE TEST: PASS');
  } finally {
    https.get = originalGet;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
