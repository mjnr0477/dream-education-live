'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

for (const file of ['public/app.js', 'public/dream-search.js']) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /\\`/, file + ' contains escaped template backticks');
  assert.doesNotThrow(() => new vm.Script(source, { filename: file }), file + ' must parse');
}

const search = fs.readFileSync('public/dream-search.js', 'utf8');
assert.match(search, /window\.DreamEducationSearch\s*=\s*\{\s*openAuthorizedSearch\s*\}/);
assert.match(search, /data-panel-action="authorized-search"/);
assert.match(search, /\/api\/dream-search\/public/);
assert.match(search, /\/api\/dream-search\/authorized/);
assert.match(search, /function openResultsPage\(query\)/, 'public search should open a dedicated results page');
assert.match(search, /function closeResultsPage\(\)/, 'results page should return to the landing page');
assert.match(search, /data-dream-search-back/g, 'results page should expose Back to Home controls');
assert.match(search, /dream-search-page-results/, 'results should render inside the dedicated results view');
assert.match(search, /search\(cleanQuery, null, state\.resultsStatus, state\.resultsHost\)/, 'public results should use the existing search function');

console.log('DREAM SEARCH FRONTEND SYNTAX SMOKE TEST: PASS');
