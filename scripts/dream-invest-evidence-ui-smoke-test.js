"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "public/dream-invest.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
new vm.Script(source, { filename: "public/dream-invest.js" });

const start = source.indexOf("  function renderAnalysis(data) {");
const end = source.indexOf("\n  async function loadMarket", start);
assert.notEqual(start, -1, "Trading analysis renderer must exist.");
assert.ok(end > start, "Trading analysis renderer must have a closing boundary.");
const renderSource = source.slice(start, end);

function render(data, trend) {
  const sandbox = {
    __data: data,
    __trend: trend,
    __forecast: "not-called",
    forecastForBars() { return this.__trend; },
    money(value) { return Number.isFinite(Number(value)) ? "$" + Number(value).toFixed(2) : "—"; },
    esc(value) { return String(value == null ? "" : value); },
    renderPredictionChart(bars, forecast) { this.__forecast = forecast; return "<chart>"; }
  };
  vm.runInNewContext(renderSource + "\nthis.__html = renderAnalysis(this.__data);", sandbox);
  return sandbox;
}

const bars = Array.from({ length: 25 }, (_, i) => ({ c: 100 + i, t: "2026-10-15T10:00:00Z" }));
const trendUp = { last: 124, predicted: 125, changePct: 0.8, direction: "UP" };
const trendDown = { last: 124, predicted: 123, changePct: -0.8, direction: "DOWN" };

const withheld = render({
  symbol: "AAPL", timeframe: "1Day", bars, updated_at: bars[bars.length - 1].t,
  indicators: { signal: "HOLD", directional_signal_released: false, signal_status: "insufficient_backtest_evidence",
    warning: "Directional signal withheld for insufficient evidence.", backtest_signals_available: 0,
    backtest_hit_rate_pct: null, backtest_signals_required: 30, backtest_hit_rate_required_pct: 55 }
}, trendUp);
assert.match(withheld.__html, /Prediction withheld/);
assert.equal(withheld.__forecast, null, "A client trend line must not bypass the backend HOLD gate.");
assert.match(withheld.__html, /hit rate: not available/);

const released = render({
  symbol: "AAPL", timeframe: "1Day", bars,
  indicators: { signal: "BUY", directional_signal_released: true, backtest_signals_available: 40,
    backtest_hit_rate_pct: 60, backtest_signals_required: 30, backtest_hit_rate_required_pct: 55 }
}, trendUp);
assert.match(released.__html, /Evidence-screened rise signal/);
assert.equal(released.__forecast, trendUp, "A trend projection is shown only when it agrees with an evidence-screened signal.");

const disagreement = render({
  symbol: "AAPL", timeframe: "1Day", bars,
  indicators: { signal: "BUY", directional_signal_released: true, backtest_signals_available: 40,
    backtest_hit_rate_pct: 60, backtest_signals_required: 30, backtest_hit_rate_required_pct: 55 }
}, trendDown);
assert.match(disagreement.__html, /Signals disagree/);
assert.equal(disagreement.__forecast, null, "Conflicting direction estimates must be withheld.");
assert.match(index, /dream-invest\.js\?v=20261015c/);

console.log("Dream Invest evidence-gated UI smoke test passed.");
