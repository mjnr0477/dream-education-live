"use strict";

const assert = require("node:assert/strict");
const { registerDreamInvestAccessRoutes, isDreamInvestEnabled } = require("../product/dream_invest_access");

async function main() {
  const routes = { get: {}, post: {}, use: [] };
  const app = {
    get(path, handler) { routes.get[path] = handler; },
    post(path, handler) { routes.post[path] = handler; },
    use(path, handler) { routes.use.push({ path, handler }); }
  };
  const accounts = {
    user_a: { account_id: "user_a", role: "learner", dream_invest_enabled: false },
    user_b: { account_id: "user_b", role: "teacher" }
  };
  const dataEngine = {
    getAccount(id) { return accounts[id] ? { ...accounts[id] } : null; },
    saveAccount(account) { accounts[account.account_id] = { ...account }; }
  };
  const getAuthenticatedAccount = async req => {
    const id = req.headers && req.headers.authorization === "Bearer user-a"
      ? "user_a"
      : req.headers && req.headers.authorization === "Bearer user-b"
        ? "user_b"
        : null;
    return id
      ? { success: true, account: { ...accounts[id] } }
      : { success: false, status: 401, error: "Sign in required." };
  };
  registerDreamInvestAccessRoutes(app, { getAuthenticatedAccount, dataEngine });
  assert.equal(typeof routes.get["/api/dream-invest/preferences"], "function");
  assert.equal(typeof routes.post["/api/dream-invest/preferences"], "function");
  assert.equal(routes.use.length, 1);
  assert.equal(routes.use[0].path, "/api/dream-invest");

  function response() {
    return {
      statusCode: 200, body: null,
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; }
    };
  }
  const middleware = routes.use[0].handler;

  let res = response();
  await routes.get["/api/dream-invest/preferences"]({ headers: {} }, res);
  assert.equal(res.statusCode, 401, "Preferences require authentication.");

  res = response();
  await routes.get["/api/dream-invest/preferences"]({ headers: { authorization: "Bearer user-a" } }, res);
  assert.equal(res.body.enabled, false, "Dream Invest is off by default.");

  let nextCalled = false;
  res = response();
  await middleware({ headers: { authorization: "Bearer user-a" } }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403, "Disabled accounts cannot reach Dream Invest API routes.");
  assert.equal(res.body.feature_disabled, true);
  assert.equal(nextCalled, false);

  res = response();
  await routes.post["/api/dream-invest/preferences"]({
    headers: { authorization: "Bearer user-a" }, body: { enabled: true }
  }, res);
  assert.equal(res.body.enabled, true);
  assert.equal(accounts.user_a.dream_invest_enabled, true, "Opt-in persists on the user's account.");

  res = response();
  await routes.get["/api/dream-invest/preferences"]({ headers: { authorization: "Bearer user-a" } }, res);
  assert.equal(res.body.enabled, true);

  nextCalled = false;
  res = response();
  await middleware({ headers: { authorization: "Bearer user-a" } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true, "Enabled accounts can reach Dream Invest API routes.");

  res = response();
  await routes.post["/api/dream-invest/preferences"]({
    headers: { authorization: "Bearer user-a" }, body: { enabled: false }
  }, res);
  assert.equal(res.body.enabled, false, "Users can turn Dream Invest off again.");

  nextCalled = false;
  res = response();
  await middleware({ headers: { authorization: "Bearer user-a" } }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);

  res = response();
  await routes.post["/api/dream-invest/preferences"]({
    headers: { authorization: "Bearer user-a" }, body: { enabled: "true" }
  }, res);
  assert.equal(res.statusCode, 400, "Preference changes accept a boolean only.");

  res = response();
  await routes.get["/api/dream-invest/preferences"]({ headers: { authorization: "Bearer user-b" } }, res);
  assert.equal(res.body.enabled, false, "One user's opt-in must not enable the feature for another user.");
  assert.equal(isDreamInvestEnabled({ dream_invest_enabled: true }), true);
  assert.equal(isDreamInvestEnabled({ dream_invest_enabled: 1 }), false);

  console.log("Dream Invest user opt-in smoke test passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
