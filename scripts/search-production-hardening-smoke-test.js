'use strict';

const assert = require('assert');
const { validateSearchItem, filterSearchResults, buildSearchQuality } = require('../product/dream_search_quality');

const publicGood = {
  title: 'Photosynthesis',
  source: 'Trusted source',
  extract: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
  evidence: [{ type: 'text', content: 'Plants use light energy, carbon dioxide and water to produce chemical energy.' }],
  media: [{ type: 'image', url: 'https://example.com/photo.jpg' }]
};
assert.strictEqual(validateSearchItem(publicGood, 'public').valid, true);

const privateLeak = {
  title: 'Owner record',
  source: 'Authorized source',
  extract: 'Secret record content that must never enter Public Search.',
  private: true,
  authorized: true
};
assert.strictEqual(validateSearchItem(privateLeak, 'public').valid, false);

const weak = { title: 'Weak', source: 'Source', extract: 'too short' };
assert.strictEqual(validateSearchItem(weak, 'public').valid, false);

const mixed = filterSearchResults([publicGood, privateLeak, weak], 'public');
assert.strictEqual(mixed.accepted.length, 1);
assert.strictEqual(mixed.rejected.length, 2);

const quality = buildSearchQuality([publicGood], 'public');
assert.strictEqual(quality.accepted, 1);
assert.strictEqual(quality.with_media, 1);
assert.strictEqual(quality.evidence_ready, 1);

console.log('SEARCH PRODUCTION HARDENING SMOKE TEST: PASS');
