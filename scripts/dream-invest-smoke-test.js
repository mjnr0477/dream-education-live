"use strict";

const assert = require("node:assert/strict");
const { registerDreamInvestRoutes, buildIndicators, buildBacktest, normalizeMarketBars } = require("../product/dream_invest_engine");

async function main() {
  const routes = { get: {}, post: {} };
  const app = {
    get(path, handler) { routes.get[path] = handler; },
    post(path, handler) { routes.post[path] = handler; }
  };
  const previous = {
    key: process.env.ALPACA_API_KEY,
    secret: process.env.ALPACA_API_SECRET,
    base: process.env.ALPACA_BASE_URL,
    fetch: global.fetch
  };
  process.env.ALPACA_API_KEY = "test-paper-key";
  process.env.ALPACA_API_SECRET = "test-paper-secret";
  process.env.ALPACA_BASE_URL = "https://paper-api.alpaca.markets/v2";

  let requestedUrl = "";
  let requestOptions = null;
  const bars = Array.from({ length: 40 }, (_, index) => {
    const close = 100 + index * 0.6;
    return { t: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), o: close - 0.2, h: close + 1, l: close - 1, c: close, v: 10000 };
  });
  global.fetch = async (url, options) => {
    requestedUrl = String(url);
    requestOptions = options;
    if (requestedUrl.endsWith("/account")) {
      return { ok: true, status: 200, json: async () => ({ status: "ACTIVE", currency: "USD", cash: "100000", equity: "101000", last_equity: "100000", buying_power: "200000", portfolio_value: "101000" }) };
    }
    if (requestedUrl.includes("/stocks/AAPL/bars?")) {
      return { ok: true, status: 200, json: async () => ({ bars }) };
    }
    if (requestedUrl.endsWith("/orders")) {
      return { ok: true, status: 201, json: async () => ({ id: "paper-order-1", symbol: "AAPL", qty: "1", side: "buy", type: "market", status: "accepted", submitted_at: new Date().toISOString() }) };
    }
    return { ok: false, status: 404, json: async () => ({ message: "not found" }) };
  };

  registerDreamInvestRoutes(app, {
    getAuthenticatedAccount: async req => req.headers.authorization === "Bearer owner"
      ? { success: true, account: { email: "mathiassimiyu52@gmail.com", owner_account: true } }
      : req.headers.authorization === "Bearer other"
        ? { success: true, account: { email: "learner@example.com" } }
        : { success: false, status: 401, error: "Sign in required." }
  });

  assert.equal(typeof routes.get["/api/dream-invest/status"], "function");
  assert.equal(typeof routes.get["/api/dream-invest/account"], "function");
  assert.equal(typeof routes.get["/api/dream-invest/bars"], "function");
  assert.equal(typeof routes.post["/api/dream-invest/orders"], "function");

  function response() {
    return {
      statusCode: 200, body: null,
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; }
    };
  }

  let res = response();
  await routes.get["/api/dream-invest/status"]({ headers: {} }, res);
  assert.equal(res.statusCode, 401);

  res = response();
  await routes.get["/api/dream-invest/status"]({ headers: { authorization: "Bearer other" } }, res);
  assert.equal(res.statusCode, 403);

  res = response();
  await routes.get["/api/dream-invest/status"]({ headers: { authorization: "Bearer owner" } }, res);
  assert.equal(res.body.success, true);
  assert.equal(res.body.paper_only, true);
  assert.equal(res.body.configured, true);

  res = response();
  await routes.get["/api/dream-invest/account"]({ headers: { authorization: "Bearer owner" } }, res);
  assert.equal(res.body.account.paper_trading, true);
  assert.equal(res.body.account.cash, "100000");
  assert.equal(res.body.account.daily_equity_change, "1000");
  assert.equal(Number(res.body.account.daily_equity_change_pct).toFixed(2), "1.00");
  assert.equal(requestOptions.headers["APCA-API-KEY-ID"], "test-paper-key");
  assert.equal(JSON.stringify(res.body).includes("test-paper-secret"), false);

  res = response();
  await routes.get["/api/dream-invest/bars"]({ headers: { authorization: "Bearer owner" }, query: { symbol: "AAPL", timeframe: "1Day", limit: "100" } }, res);
  assert.equal(res.body.success, true);
  assert.equal(res.body.bars.length, 40);
  assert.ok(["BUY", "SELL", "HOLD"].includes(res.body.indicators.signal));
  assert.ok(requestedUrl.startsWith("https://data.alpaca.markets/v2/stocks/AAPL/bars?"));

  res = response();
  await routes.get["/api/dream-invest/bars"]({ headers: { authorization: "Bearer owner" }, query: { symbol: "AAPL;DROP", timeframe: "1Day" } }, res);
  assert.equal(res.statusCode, 400);

  res = response();
  await routes.post["/api/dream-invest/orders"]({ headers: { authorization: "Bearer owner" }, body: { symbol: "AAPL", side: "buy", qty: 1 } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.paper_only, true);
  assert.equal(res.body.order.status, "accepted");
  assert.equal(requestOptions.headers["APCA-API-SECRET-KEY"], "test-paper-secret");

  res = response();
  await routes.post["/api/dream-invest/orders"]({ headers: { authorization: "Bearer owner" }, body: { symbol: "AAPL", side: "buy", qty: 11 } }, res);
  assert.equal(res.statusCode, 400);

  assert.equal(normalizeMarketBars({ bars }, "AAPL").length, 40);
  assert.equal(normalizeMarketBars({ bars: { AAPL: bars } }, "AAPL").length, 40);
  assert.equal(normalizeMarketBars({ data: { bars: { AAPL: bars } } }, "AAPL").length, 40);
  assert.equal(normalizeMarketBars({ bars: [] }, "AAPL").length, 0);

  const indicators = buildIndicators(bars);
  assert.ok(Number.isFinite(indicators.heuristic_score));
  const backtest = buildBacktest(bars);
  assert.ok(backtest.evaluated_signals >= 0);

  if (previous.key === undefined) delete process.env.ALPACA_API_KEY; else process.env.ALPACA_API_KEY = previous.key;
  if (previous.secret === undefined) delete process.env.ALPACA_API_SECRET; else process.env.ALPACA_API_SECRET = previous.secret;
  if (previous.base === undefined) delete process.env.ALPACA_BASE_URL; else process.env.ALPACA_BASE_URL = previous.base;
  global.fetch = previous.fetch;
  console.log("Dream Invest smoke test passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
