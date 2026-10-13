"use strict";

const PAPER_BASE_URL = "https://paper-api.alpaca.markets/v2";
const DATA_BASE_URL = "https://data.alpaca.markets/v2";
const OWNER_EMAIL = "mathiassimiyu52@gmail.com";

function normalizeText(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function isOwner(account) {
  return Boolean(account && (
    account.owner_account === true ||
    String(account.email || "").trim().toLowerCase() === OWNER_EMAIL
  ));
}

function safeAccount(account) {
  return {
    status: account.status || "unknown",
    currency: account.currency || "USD",
    cash: account.cash == null ? null : String(account.cash),
    portfolio_value: account.portfolio_value == null ? null : String(account.portfolio_value),
    equity: account.equity == null ? null : String(account.equity),
    buying_power: account.buying_power == null ? null : String(account.buying_power),
    pattern_day_trader: Boolean(account.pattern_day_trader),
    trading_blocked: Boolean(account.trading_blocked),
    account_blocked: Boolean(account.account_blocked),
    paper_trading: true
  };
}

function calculateSma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function buildIndicators(bars) {
  const closes = bars.map(bar => Number(bar.c)).filter(Number.isFinite);
  const latest = closes[closes.length - 1];
  const sma5 = calculateSma(closes, 5);
  const sma20 = calculateSma(closes, 20);
  const sma50 = calculateSma(closes, 50);
  const previous10 = closes.length > 10 ? closes[closes.length - 11] : null;
  const momentum10Pct = previous10 && previous10 !== 0
    ? ((latest - previous10) / previous10) * 100
    : null;
  const returns = [];
  for (let i = Math.max(1, closes.length - 20); i < closes.length; i += 1) {
    if (closes[i - 1]) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const volatility20Pct = returns.length
    ? Math.sqrt(returns.reduce((sum, value) => sum + value * value, 0) / returns.length) * 100
    : null;

  let score = 0;
  if (sma5 !== null && sma20 !== null && latest > 0) {
    score += Math.max(-35, Math.min(35, ((sma5 - sma20) / latest) * 1000));
  }
  if (momentum10Pct !== null) {
    score += Math.max(-35, Math.min(35, momentum10Pct * 3));
  }
  if (sma20 !== null && latest > 0) {
    score += Math.max(-30, Math.min(30, ((latest - sma20) / latest) * 1000));
  }
  score = Math.round(Math.max(-100, Math.min(100, score)));

  const signal = score >= 25 ? "BUY" : score <= -25 ? "SELL" : "HOLD";
  return {
    latest_close: latest,
    sma_5: sma5,
    sma_20: sma20,
    sma_50: sma50,
    momentum_10_pct: momentum10Pct,
    volatility_20_pct: volatility20Pct,
    heuristic_score: score,
    signal,
    method: "SMA trend + 10-bar momentum + distance from SMA20",
    warning: "This is a rule-based research signal, not a calibrated probability or a guarantee of future price direction."
  };
}

function buildBacktest(bars) {
  const closes = bars.map(bar => Number(bar.c)).filter(Number.isFinite);
  const outcomes = [];
  for (let i = 20; i < closes.length - 1; i += 1) {
    const window = closes.slice(0, i + 1);
    const last = window[window.length - 1];
    const sma5 = calculateSma(window, 5);
    const sma20 = calculateSma(window, 20);
    const prev10 = window.length > 10 ? window[window.length - 11] : null;
    let score = 0;
    if (sma5 !== null && sma20 !== null && last > 0) score += Math.max(-35, Math.min(35, ((sma5 - sma20) / last) * 1000));
    if (prev10 && prev10 !== 0) score += Math.max(-35, Math.min(35, ((last - prev10) / prev10) * 300));
    if (sma20 !== null && last > 0) score += Math.max(-30, Math.min(30, ((last - sma20) / last) * 1000));
    const signal = score >= 25 ? "BUY" : score <= -25 ? "SELL" : "HOLD";
    const nextReturn = closes[i + 1] / last - 1;
    if (signal !== "HOLD") {
      outcomes.push({
        signal,
        correct_direction: signal === "BUY" ? nextReturn > 0 : nextReturn < 0,
        next_return_pct: nextReturn * 100
      });
    }
  }
  const correct = outcomes.filter(item => item.correct_direction).length;
  const buys = outcomes.filter(item => item.signal === "BUY").length;
  const sells = outcomes.length - buys;
  return {
    evaluated_signals: outcomes.length,
    directional_hit_rate_pct: outcomes.length ? (correct / outcomes.length) * 100 : null,
    buy_signals: buys,
    sell_signals: sells,
    methodology: "Walk-forward next-bar direction check on the returned historical bars; excludes HOLD signals and is not a full portfolio backtest.",
    warning: "Historical hit rate is not a prediction guarantee. This basic test excludes fees, slippage, spreads and execution effects."
  };
}

function registerDreamInvestRoutes(app, options = {}) {
  const getAuthenticatedAccount = options.getAuthenticatedAccount;

  async function requireOwner(req, res) {
    if (typeof getAuthenticatedAccount !== "function") {
      res.status(503).json({ success: false, error: "Dream Education authentication is unavailable." });
      return null;
    }
    try {
      const auth = await getAuthenticatedAccount(req);
      if (!auth || !auth.success || !auth.account) {
        res.status(Number(auth && auth.status) || 401).json({
          success: false,
          error: (auth && auth.error) || "Sign in to Dream Education first."
        });
        return null;
      }
      if (!isOwner(auth.account)) {
        res.status(403).json({ success: false, error: "Dream Invest is currently restricted to the Dream Education owner account." });
        return null;
      }
      return auth.account;
    } catch (_) {
      res.status(503).json({ success: false, error: "Could not verify your Dream Education account." });
      return null;
    }
  }

  function getCredentials(res) {
    const key = String(process.env.ALPACA_API_KEY || "").trim();
    const secret = String(process.env.ALPACA_API_SECRET || "").trim();
    const configuredBase = String(process.env.ALPACA_BASE_URL || PAPER_BASE_URL).trim().replace(/\/+$/, "");
    if (!key || !secret) {
      res.status(503).json({ success: false, error: "Alpaca paper API credentials are not configured in the server environment." });
      return null;
    }
    if (configuredBase !== PAPER_BASE_URL) {
      res.status(503).json({ success: false, error: "Dream Invest only permits the Alpaca paper-trading endpoint in this release." });
      return null;
    }
    return { key, secret };
  }

  async function alpacaRequest(url, credentials, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      return await fetch(url, {
        method: options.method || "GET",
        headers: {
          "APCA-API-KEY-ID": credentials.key,
          "APCA-API-SECRET-KEY": credentials.secret,
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {})
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  app.get("/api/dream-invest/status", async (req, res) => {
    const account = await requireOwner(req, res);
    if (!account) return;
    return res.json({
      success: true,
      product: "Dream Invest",
      configured: Boolean(String(process.env.ALPACA_API_KEY || "").trim() && String(process.env.ALPACA_API_SECRET || "").trim()),
      paper_only: true,
      automated_trading_enabled: false,
      owner_access: true
    });
  });

  app.get("/api/dream-invest/account", async (req, res) => {
    const account = await requireOwner(req, res);
    if (!account) return;
    const credentials = getCredentials(res);
    if (!credentials) return;
    try {
      const upstream = await alpacaRequest(PAPER_BASE_URL + "/account", credentials);
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return res.status(upstream.status === 401 ? 502 : upstream.status).json({
          success: false,
          error: upstream.status === 401
            ? "Alpaca rejected the credentials. Confirm that these are the paper account's API keys."
            : "Alpaca could not return the paper account details."
        });
      }
      return res.json({ success: true, account: safeAccount(data), paper_only: true });
    } catch (error) {
      return res.status(error && error.name === "AbortError" ? 504 : 502).json({
        success: false,
        error: error && error.name === "AbortError" ? "Alpaca timed out. Try again." : "Could not reach Alpaca Paper Trading."
      });
    }
  });

  app.get("/api/dream-invest/bars", async (req, res) => {
    const account = await requireOwner(req, res);
    if (!account) return;
    const credentials = getCredentials(res);
    if (!credentials) return;
    const symbol = normalizeText(req.query && req.query.symbol, 12).toUpperCase();
    const timeframe = normalizeText(req.query && req.query.timeframe, 10) || "1Day";
    const limit = Math.max(30, Math.min(500, Number.parseInt(req.query && req.query.limit, 10) || 100));
    if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(symbol)) {
      return res.status(400).json({ success: false, error: "Enter a valid US stock symbol, such as AAPL or MSFT." });
    }
    if (!["1Min", "5Min", "15Min", "1Hour", "1Day"].includes(timeframe)) {
      return res.status(400).json({ success: false, error: "Choose a supported timeframe: 1Min, 5Min, 15Min, 1Hour or 1Day." });
    }
    try {
      const params = new URLSearchParams({ timeframe, limit: String(limit), adjustment: "split", feed: "iex", sort: "asc" });
      const upstream = await alpacaRequest(DATA_BASE_URL + "/stocks/" + encodeURIComponent(symbol) + "/bars?" + params.toString(), credentials);
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return res.status(upstream.status === 401 ? 502 : upstream.status).json({
          success: false,
          error: upstream.status === 401
            ? "Alpaca rejected the market-data credentials."
            : normalizeText(data.message || data.error, 250) || "Alpaca market data is unavailable for this symbol or feed."
        });
      }
      const bars = Array.isArray(data.bars) ? data.bars.filter(bar => Number.isFinite(Number(bar.c)) && Number.isFinite(Date.parse(bar.t))) : [];
      if (bars.length < 22) {
        return res.status(422).json({ success: false, error: "Not enough market bars returned to calculate a trend. Try a liquid US-listed stock or another timeframe." });
      }
      const indicators = buildIndicators(bars);
      return res.json({
        success: true,
        symbol,
        timeframe,
        feed: "iex",
        bars,
        indicators,
        backtest: buildBacktest(bars),
        updated_at: bars[bars.length - 1].t,
        paper_only: true
      });
    } catch (error) {
      return res.status(error && error.name === "AbortError" ? 504 : 502).json({
        success: false,
        error: error && error.name === "AbortError" ? "Market-data request timed out." : "Could not retrieve Alpaca market data."
      });
    }
  });

  app.post("/api/dream-invest/orders", async (req, res) => {
    const account = await requireOwner(req, res);
    if (!account) return;
    const credentials = getCredentials(res);
    if (!credentials) return;
    const symbol = normalizeText(req.body && req.body.symbol, 12).toUpperCase();
    const side = normalizeText(req.body && req.body.side, 4).toLowerCase();
    const qty = Number(req.body && req.body.qty);
    if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(symbol)) return res.status(400).json({ success: false, error: "Enter a valid US stock symbol." });
    if (!["buy", "sell"].includes(side)) return res.status(400).json({ success: false, error: "Order side must be buy or sell." });
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return res.status(400).json({ success: false, error: "Paper orders are limited to 1–10 whole shares per order in this first release." });
    try {
      const upstream = await alpacaRequest(PAPER_BASE_URL + "/orders", credentials, {
        method: "POST",
        body: { symbol, qty: String(qty), side, type: "market", time_in_force: "day" }
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return res.status(upstream.status >= 400 && upstream.status < 500 ? 400 : 502).json({
          success: false,
          error: normalizeText(data.message || data.code, 250) || "Alpaca did not accept the paper order."
        });
      }
      return res.status(201).json({
        success: true,
        paper_only: true,
        order: {
          id: data.id,
          symbol: data.symbol,
          qty: data.qty,
          side: data.side,
          type: data.type,
          status: data.status,
          submitted_at: data.submitted_at
        }
      });
    } catch (error) {
      return res.status(error && error.name === "AbortError" ? 504 : 502).json({
        success: false,
        error: error && error.name === "AbortError" ? "Paper order submission timed out. Check the Alpaca paper dashboard before retrying." : "Could not submit the paper order."
      });
    }
  });
}

module.exports = { registerDreamInvestRoutes, buildIndicators, buildBacktest, isOwner };
