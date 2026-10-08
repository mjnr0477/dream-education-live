'use strict';

const assert = require('assert');
const {
  getPlatformCatalog,
  getPlatform,
  supportsAction,
  normalizePlatform
} = require('../product/connect_platform_registry');

const catalog = getPlatformCatalog();
assert.ok(Array.isArray(catalog) && catalog.length >= 10, 'platform catalog should cover the initial global surface');

for (const platform of catalog) {
  assert.ok(platform.id && platform.name, 'every platform needs an id and name');
  assert.ok(Array.isArray(platform.channels), 'every platform needs channels');
  assert.ok(Array.isArray(platform.actions), 'every platform needs actions');
}

assert.strictEqual(normalizePlatform(' YouTube '), 'youtube');
assert.ok(getPlatform('reddit'));
assert.ok(getPlatform('matrix'));
assert.ok(getPlatform('mastodon'));
assert.ok(getPlatform('bluesky'));
assert.ok(getPlatform('discord'));
assert.strictEqual(supportsAction('reddit', 'post'), true);
assert.strictEqual(supportsAction('matrix', 'direct_message'), true);
assert.strictEqual(supportsAction('mastodon', 'post'), true);
assert.strictEqual(supportsAction('bluesky', 'post'), true);
assert.strictEqual(supportsAction('discord', 'webhook'), true);
assert.strictEqual(supportsAction('quora', 'post'), false);
assert.strictEqual(supportsAction('unknown-platform', 'send'), false);

console.log('Global messenger platform registry smoke test passed.');
