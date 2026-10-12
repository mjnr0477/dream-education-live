'use strict';

const assert = require('assert');
const fs = require('fs');

const sourceEngine = fs.readFileSync(require.resolve('../product/source_engine'), 'utf8');
const catalog = require('../product/global_sources/catalog');
const notesProviders = fs.readFileSync(require.resolve('../product/notes_source_providers'), 'utf8');

for (const provider of [
  'wikimedia_commons',
  'openaire',
  'doaj',
  'stack_exchange',
  'zenodo',
  'wikibooks'
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
assert.ok(notesProviders.includes('searchLibreTexts') && notesProviders.includes('searchOpenStax'), 'open textbook adapters missing');
console.log('GLOBAL SOURCE EXPANSION SMOKE TEST: PASS');
