'use strict';

const assert = require('assert');
const {
  registerDreamSearchRoutes,
  normalizeQuery
} = require('../product/dream_search_engine');

const routes = {};
registerDreamSearchRoutes({
  post(path, handler) { routes[path] = handler; }
}, {
  async getAuthenticatedAccount() {
    return { success: true, account: { owner_account: true } };
  },
  isOwnerAccount(account) {
    return account?.owner_account === true;
  }
});

assert.ok(routes['/api/dream-search/public']);
assert.ok(routes['/api/dream-search/authorized']);
assert.strictEqual(normalizeQuery('  hello   world  '), 'hello world');

(async () => {
  const ownerReq = {
    body: { query: 'test' },
    headers: { authorization: 'Bearer owner-session' }
  };
  const ownerRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await routes['/api/dream-search/authorized'](ownerReq, ownerRes);
  assert.notStrictEqual(ownerRes.statusCode, 401);
  assert.notStrictEqual(ownerRes.statusCode, 403);

  console.log('DREAM SEARCH SMOKE TEST: PASS');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
