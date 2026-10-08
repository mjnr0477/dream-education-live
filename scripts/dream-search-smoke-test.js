'use strict';

process.env.DREAM_AUTHORIZED_SEARCH_DATA = JSON.stringify([{ title: 'Owner private fact', content: 'private owner information' }]);
process.env.DREAM_AUTHORIZED_SEARCH_OVERRIDES = JSON.stringify([{ title: 'Owner override', content: 'test owner authoritative information', target_title: 'Test' }]);

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
  },
  async searchPublic() {
    return { success: true, results: [{ title: 'Test', source: 'Smoke Test', excerpt: 'Verified test result.' }] };
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
  assert.ok(ownerRes.body.authorized_results.some(item => item.authoritative === true));
  assert.strictEqual(ownerRes.body.results[0].authoritative, true);
  assert.strictEqual(ownerRes.body.results[0].target_title, 'Test');
  assert.ok(ownerRes.body.connected_providers.includes('smoke-test') === false);
  assert.deepStrictEqual(ownerRes.body.public_results, [{ title: 'Test', source: 'Smoke Test', excerpt: 'Verified test result.' }]);
  assert.strictEqual(ownerRes.body.search_scope, 'all-connected-public-sources-plus-owner-authorized-sources');

  const nonOwnerRoutes = {};
  registerDreamSearchRoutes({
    post(path, handler) { nonOwnerRoutes[path] = handler; }
  }, {
    async getAuthenticatedAccount() {
      return { success: true, account: { owner_account: false } };
    },
    isOwnerAccount(account) {
      return account?.owner_account === true;
    },
    async searchPublic() {
      return { success: true, results: [] };
    }
  });

  const nonOwnerRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await nonOwnerRoutes['/api/dream-search/authorized']({
    body: { query: 'test' },
    headers: { authorization: 'Bearer non-owner-session' }
  }, nonOwnerRes);
  assert.strictEqual(nonOwnerRes.statusCode, 403);
  assert.ok(/restricted to the Dream Education owner/i.test(nonOwnerRes.body.error));

  const publicReq = {
    body: { query: 'test' },
    headers: {}
  };
  const publicRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await routes['/api/dream-search/public'](publicReq, publicRes);
  assert.ok(!JSON.stringify(publicRes.body).includes('Owner private fact'));
  assert.ok(!JSON.stringify(publicRes.body).includes('Owner override'));

  console.log('DREAM SEARCH SMOKE TEST: PASS');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
