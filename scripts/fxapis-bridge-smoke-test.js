"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { registerFxapisRoutes } = require("../product/fxapis_bridge");
async function main() {
  const routes = { get: {}, post: {} };
  const app = { get(p, h) { routes.get[p] = h; }, post(p, h) { routes.post[p] = h; } };
  const oldKey = process.env.FXAPIS_API_KEY;
  const oldFetch = global.fetch;
  const savedFile = path.join(__dirname, "..", "data", "fxapis-account.json");
  const saved = fs.existsSync(savedFile) ? fs.readFileSync(savedFile, "utf8") : null;
  try {
    process.env.FXAPIS_API_KEY = "fx_test_fake_secret";
    registerFxapisRoutes(app, { getAuthenticatedAccount: async req =>
      req.headers.authorization === "Bearer owner" ? { success: true, account: { email: "mathiassimiyu52@gmail.com", owner_account: true } }
      : req.headers.authorization === "Bearer other" ? { success: true, account: { email: "learner@example.com" } }
      : { success: false, status: 401, error: "Sign in required." } });
    const res = () => ({ statusCode: 200, body: null, status(n) { this.statusCode=n; return this; }, json(v) { this.body=v; return this; } });
    let r=res(); await routes.get["/api/dream-invest/fxapis/status"]({headers:{}},r); assert.equal(r.statusCode,401);
    r=res(); await routes.get["/api/dream-invest/fxapis/status"]({headers:{authorization:"Bearer other"}},r); assert.equal(r.statusCode,403);
    global.fetch = async (url, opts) => ({ ok:true, status: opts.method === "POST" ? 201 : 200, json:async()=> opts.method === "POST" ? ({ id: "fxacct-test-1", status: "created", platform: "mt5" }) : ({ accounts: [] }) });
    r=res(); await routes.get["/api/dream-invest/fxapis/status"]({headers:{authorization:"Bearer owner"}},r);
    assert.equal(r.body.configured,true); assert.equal(r.body.trading_enabled,false);
    r=res(); await routes.post["/api/dream-invest/fxapis/connect"]({headers:{authorization:"Bearer owner"},body:{login:"12345678",server:"JustMarkets-Demo",password:"private"}},r);
    assert.equal(r.statusCode,201); assert.equal(r.body.connected,true); assert.equal(r.body.trading_enabled,false);
    assert.equal(JSON.stringify(r.body).includes("private"),false);
    const stored=fs.readFileSync(savedFile,"utf8"); assert.equal(stored.includes("private"),false);
    r=res(); await routes.post["/api/dream-invest/fxapis/connect"]({headers:{authorization:"Bearer owner"},body:{login:"bad",server:"JustMarkets-Demo",password:"x"}},r); assert.equal(r.statusCode,400);
    r=res(); await routes.post["/api/dream-invest/fxapis/connect"]({headers:{authorization:"Bearer owner"},body:{login:"12345678",server:"JustMarkets-Demo",password:"private"}},r); assert.equal(r.statusCode,409);
    console.log("FXAPIS bridge smoke test passed.");
  } finally {
    if (oldKey === undefined) delete process.env.FXAPIS_API_KEY; else process.env.FXAPIS_API_KEY=oldKey;
    global.fetch=oldFetch;
    if (saved === null) { try { fs.unlinkSync(savedFile); } catch (_) {} } else fs.writeFileSync(savedFile,saved);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
