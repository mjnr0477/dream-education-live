'use strict';

const assert = require('assert');
const fs = require('fs');

const sourceEngine = fs.readFileSync(require.resolve('../product/source_engine'), 'utf8');
const catalog = require('../product/global_sources/catalog');
const notesProviders = require('../product/notes_source_providers');
const globalSources = require('../product/global_sources');

for (const provider of [
  'wikimedia_commons',
  'openaire',
  'doaj',
  'stack_exchange',
  'zenodo',
  'wikibooks',
  'libretexts',
  'openstax'
]) {
  assert.ok(sourceEngine.includes(`name: "${provider}"`), `source engine provider missing: ${provider}`);
}

for (const id of ['wikimedia_commons', 'openaire', 'doaj', 'stack_exchange', 'zenodo', 'wikibooks', 'libretexts', 'openstax']) {
  const source = catalog.getSource(id);
  assert.ok(source, `catalog source missing: ${id}`);
  assert.strictEqual(source.status, 'connected', `source not connected: ${id}`);
}

assert.ok(sourceEngine.includes('notesSourceProviders.searchLibreTexts'), 'LibreTexts adapter not wired into source engine');
assert.ok(sourceEngine.includes('notesSourceProviders.searchOpenStax'), 'OpenStax adapter not wired into source engine');
assert.strictEqual(typeof notesProviders.searchLibreTexts, 'function', 'LibreTexts adapter missing');
assert.strictEqual(typeof notesProviders.searchOpenStax, 'function', 'OpenStax adapter missing');
assert.ok(sourceEngine.includes('name: "youtube"'), 'YouTube adapter not wired into source engine');
assert.strictEqual(catalog.getSource('youtube').status, 'ready', 'YouTube must be marked ready until its API key is configured');
assert.strictEqual(typeof require('../product/global_sources/providers/youtube').search, 'function', 'YouTube adapter missing');
assert.ok(globalSources.router.providerIds({domain:'media'}).includes('youtube'), 'YouTube provider missing from media route');
console.log('GLOBAL SOURCE EXPANSION SMOKE TEST: PASS');
