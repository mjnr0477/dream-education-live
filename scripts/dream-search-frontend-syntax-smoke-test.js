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

console.log('DREAM SEARCH FRONTEND SYNTAX SMOKE TEST: PASS');
