"use strict";
const assert = require("node:assert/strict");
const { registerOddsPapiRoutes, buildOddsPrediction } = require("../product/oddspapi_betting_engine");
const routes = { get: {} };
const app = { get(path, handler) { routes.get[path] = handler; } };
const oldKey = process.env.ODDSPAPI_API_KEY;
const oldFetch = global.fetch;
process.env.ODDSPAPI_API_KEY = "test-key";
let requested = "";
global.fetch = async url => {
  requested = String(url);
  return { ok: true, status: 200, json: async () => ({ data: [{ id: "fx1", name: "Team A vs Team B", odds: [{ name: "Team A", decimalOdds: 1.8 }, { name: "Draw", decimalOdds: 3.2 }, { name: "Team B", decimalOdds: 4.1 }] }] }) };
};
registerOddsPapiRoutes(app, { getAuthenticatedAccount: async req => req.headers.authorization === "Bearer owner" ? { success: true, account: { owner_account: true } } : { success: false, status: 401, error: "Sign in first." } });
function res() { return { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; }
(async () => {
  let response = res();
  await routes.get["/api/dream-invest/betting/status"]({ headers: { authorization: "Bearer owner" } }, response);
  assert.equal(response.body.configured, true);
  response = res();
  await routes.get["/api/dream-invest/betting/odds"]({ headers: { authorization: "Bearer owner" }, query: { tournamentIds: "17,8", bookmaker: "betika" } }, response);
  assert.equal(response.body.success, true);
  assert.ok(requested.includes("/v4/odds-by-tournaments"));
  assert.ok(requested.includes("apiKey=test-key"));
  response = res();
  await routes.get["/api/dream-invest/betting/odds"]({ headers: { authorization: "Bearer owner" }, query: {} }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(routes.get["/api/dream-invest/betting/sports"] instanceof Function, true);
  assert.equal(routes.get["/api/dream-invest/betting/tournaments"] instanceof Function, true);
  assert.equal(buildOddsPrediction({ data: [{ name: "A vs B", odds: [{ name: "A", decimalOdds: 1.8 }] }] }).length, 1);
  if (oldKey === undefined) delete process.env.ODDSPAPI_API_KEY; else process.env.ODDSPAPI_API_KEY = oldKey;
  global.fetch = oldFetch;
  console.log("OddsPapi betting engine smoke test passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
