'use strict';

process.env.DREAM_AUTHORIZED_SEARCH_PASSWORD = 'test-secret';

const assert = require('assert');
const {
  registerDreamSearchRoutes,
  issueAuthorizedToken,
  verifyAuthorizedToken,
  normalizeQuery
} = require('../product/dream_search_engine');

const routes = {};
registerDreamSearchRoutes({
  post(path, handler) { routes[path] = handler; }
});

assert.ok(routes['/api/dream-search/public']);
assert.ok(routes['/api/dream-search/authorized/unlock']);
assert.ok(routes['/api/dream-search/authorized']);
assert.strictEqual(normalizeQuery('  hello   world  '), 'hello world');
assert.strictEqual(verifyAuthorizedToken(issueAuthorizedToken()), true);
assert.strictEqual(verifyAuthorizedToken('invalid'), false);

(async () => {
  const req = {
    body: { password: 'wrong' },
    headers: {},
    socket: { remoteAddress: 'dream-search-test' }
  };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await routes['/api/dream-search/authorized/unlock'](req, res);
  assert.strictEqual(res.statusCode, 401);
  console.log('DREAM SEARCH SMOKE TEST: PASS');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
