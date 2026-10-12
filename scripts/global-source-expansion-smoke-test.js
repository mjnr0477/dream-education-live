'use strict';

const assert = require('assert');
const fs = require('fs');

const sourceEngine = fs.readFileSync(require.resolve('../product/source_engine'), 'utf8');
const catalog = require('../product/global_sources/catalog');
const notesProviders = require('../product/notes_source_providers');

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
console.log('GLOBAL SOURCE EXPANSION SMOKE TEST: PASS');
