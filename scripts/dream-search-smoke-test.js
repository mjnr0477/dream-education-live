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
}, {
  async getAuthenticatedAccount() {
    return { success: true, account: { owner_account: true } };
  },
  isOwnerAccount(account) {
    return account?.owner_account === true;
  }
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
    headers: { authorization: 'Bearer owner-session' },
    socket: { remoteAddress: 'dream-search-test' }
  };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await routes['/api/dream-search/authorized/unlock'](req, res);
  assert.strictEqual(res.statusCode, 401);

  const ownerReq = {
    body: { password: 'test-secret' },
    headers: { authorization: 'Bearer owner-session' },
    socket: { remoteAddress: 'dream-search-owner-test' }
  };
  const ownerRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await routes['/api/dream-search/authorized/unlock'](ownerReq, ownerRes);
  assert.strictEqual(ownerRes.statusCode, 200);
  assert.strictEqual(ownerRes.body.success, true);
  assert.ok(ownerRes.body.token);

  console.log('DREAM SEARCH SMOKE TEST: PASS');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
