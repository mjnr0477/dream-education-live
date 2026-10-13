/* Dream Invest — owner-only Alpaca paper trading UI. No API secrets enter the browser. */
(function () {
  "use strict";

  const OWNER_EMAIL = "mathiassimiyu52@gmail.com";
  const PANEL_ID = "experience-panel";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
    });
  }

  function getAuth() {
    try { return JSON.parse(localStorage.getItem("dream_education_auth") || "null"); }
    catch (_) { return null; }
  }

  function isOwner(auth) {
    const account = auth && auth.account || {};
    return Boolean(auth && auth.success && (
      account.owner_account === true ||
      String(account.email || auth.email || "").trim().toLowerCase() === OWNER_EMAIL
    ));
  }

  function authHeaders(json) {
    const auth = getAuth();
    const headers = { Accept: "application/json" };
    if (json) headers["Content-Type"] = "application/json";
    const token = auth && auth.session && auth.session.access_token;
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function api(url, options) {
    const response = await fetch(url, Object.assign({
      credentials: "same-origin",
      headers: authHeaders(Boolean(options && options.body))
    }, options || {}));
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.success === false) throw new Error(data.error || "Dream Invest request failed.");
    return data;
  }

  function openPanel(kicker, title, description, body) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    document.getElementById("panel-kicker").textContent = kicker;
    document.getElementById("panel-title").textContent = title;
    document.getElementById("panel-description").textContent = description;
    document.getElementById("panel-body").innerHTML = body;
    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden", "false");
  }

  function metric(label, value, hint) {
    return '<article class="di-metric"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(hint || "") + '</small></article>';
  }

  function money(value, currency) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(number);
  }

  function chartSvg(bars) {
    const values = bars.map(function (bar) { return Number(bar.c); }).filter(Number.isFinite);
    if (values.length < 2) return '<div class="di-empty">Not enough bars to draw a chart.</div>';
    const width = 720, height = 230, pad = 16;
    const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    const range = max - min || 1;
    const points = values.map(function (value, index) {
      const x = pad + (index / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return x.toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
    const rising = values[values.length - 1] >= values[0];
    return '<div class="di-chart-wrap"><svg class="di-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Historical closing prices">' +
      '<line x1="16" y1="50" x2="704" y2="50" class="di-gridline"/><line x1="16" y1="115" x2="704" y2="115" class="di-gridline"/><line x1="16" y1="180" x2="704" y2="180" class="di-gridline"/>' +
      '<polyline points="' + points + '" class="' + (rising ? "di-price-line-up" : "di-price-line-down") + '"/>' +
      '</svg><div class="di-chart-labels"><span>' + esc(money(min)) + ' low</span><span>' + esc(money(max)) + ' high</span></div></div>';
  }

  function renderBase() {
    openPanel("DREAM INVEST · PAPER TRADING", "Dream Invest", "Market research and simulated trading connected to your Alpaca paper account.", 
      '<div class="dream-invest">' +
        '<section class="di-banner"><div><span class="di-eyebrow">PAPER MODE · NO REAL-MONEY ORDERS</span><h3>Study the market. Test the signal.</h3><p>Rule-based indicators, historical checks and manually confirmed simulated orders. Automated execution remains off while we validate the engine.</p></div><span class="di-status" id="di-connection">Checking connection…</span></section>' +
        '<form class="di-search" id="di-market-form"><label for="di-symbol">US stock symbol</label><input id="di-symbol" name="symbol" maxlength="12" value="AAPL" required autocapitalize="characters" placeholder="AAPL"><label for="di-timeframe">Timeframe</label><select id="di-timeframe" name="timeframe"><option value="1Day">Daily</option><option value="1Hour">Hourly</option><option value="15Min">15 minutes</option><option value="5Min">5 minutes</option><option value="1Min">1 minute</option></select><button class="de-action primary" type="submit">Analyze market</button></form>' +
        '<div id="di-account-output"></div><div id="di-main-output"><div class="di-loading">Connecting to Alpaca Paper Trading…</div></div>' +
      '</div>');
  }

  function renderAccount(account) {
    return '<section class="di-metrics">' +
      metric("Paper account", account.status || "—", "Alpaca account status") +
      metric("Paper equity", money(account.equity, account.currency), "Simulated account value") +
      metric("Cash", money(account.cash, account.currency), "Available cash") +
      metric("Buying power", money(account.buying_power, account.currency), "Broker-reported buying power") +
      '</section>';
  }

  function renderAnalysis(data) {
    const indicators = data.indicators || {};
    const backtest = data.backtest || {};
    const signal = indicators.signal || "HOLD";
    const signalClass = signal.toLowerCase();
    const hitRate = Number.isFinite(Number(backtest.directional_hit_rate_pct)) && backtest.directional_hit_rate_pct !== null
      ? Number(backtest.directional_hit_rate_pct).toFixed(1) + "%"
      : "Not enough signals";
    const bars = Array.isArray(data.bars) ? data.bars : [];
    const lastBar = bars[bars.length - 1] || {};
    return '<section class="di-signal di-signal-' + esc(signalClass) + '"><div><span class="di-eyebrow">CURRENT RULE-BASED SIGNAL</span><h3>' + esc(signal) + '</h3><p>Signal score: ' + esc(indicators.heuristic_score) + ' / 100 · not a probability</p></div><strong>' + esc(money(indicators.latest_close)) + '</strong></section>' +
      '<section class="di-metrics">' +
      metric("SMA · 5 bars", money(indicators.sma_5), "Short trend") +
      metric("SMA · 20 bars", money(indicators.sma_20), "Medium trend") +
      metric("10-bar momentum", Number.isFinite(Number(indicators.momentum_10_pct)) ? Number(indicators.momentum_10_pct).toFixed(2) + "%" : "—", "Past movement, not a forecast") +
      metric("20-bar volatility", Number.isFinite(Number(indicators.volatility_20_pct)) ? Number(indicators.volatility_20_pct).toFixed(2) + "%" : "—", "Approximate return variability") +
      '</section>' +
      '<section class="di-section"><div class="di-section-head"><h3>' + esc(data.symbol) + ' price history</h3><span>' + esc(data.timeframe) + ' · ' + esc(bars.length) + ' bars</span></div>' + chartSvg(bars) +
      '<p class="di-muted">Last bar: ' + esc(lastBar.t || data.updated_at || "—") + '. Data feed: ' + esc(data.feed || "Alpaca") + '.</p></section>' +
      '<section class="di-section"><div class="di-section-head"><h3>Historical signal check</h3><span>Walk-forward</span></div><div class="di-metrics">' +
      metric("Directional hit rate", hitRate, "Only non-HOLD signals; next bar") +
      metric("Signals evaluated", backtest.evaluated_signals == null ? "0" : backtest.evaluated_signals, "On returned historical bars") +
      metric("Buy / sell signals", (backtest.buy_signals || 0) + " / " + (backtest.sell_signals || 0), "HOLD signals excluded") +
      '</div><p class="di-warning">' + esc(backtest.warning || indicators.warning || "") + '</p></section>' +
      '<section class="di-section"><div class="di-section-head"><h3>Paper order</h3><span>Maximum 10 whole shares</span></div>' +
      '<form class="di-order-form" id="di-order-form"><input type="hidden" name="symbol" value="' + esc(data.symbol) + '">' +
      '<label for="di-side">Action</label><select id="di-side" name="side"><option value="buy">Buy</option><option value="sell">Sell</option></select>' +
      '<label for="di-qty">Whole shares</label><input id="di-qty" name="qty" type="number" min="1" max="10" step="1" value="1" required>' +
      '<label class="di-confirm"><input type="checkbox" name="confirm" required> I understand this submits a simulated order to my Alpaca paper account, not a real-money trade.</label>' +
      '<button class="de-action primary" type="submit">Submit paper order</button><p class="di-muted">The signal does not place trades automatically. Review each simulated order before submitting.</p></form><div id="di-order-result" aria-live="polite"></div></section>' +
      '<p class="di-disclaimer">Research prototype only. Signals are not calibrated probabilities or financial advice. The basic hit-rate check does not include fees, spreads, slippage or portfolio risk and does not establish profitability.</p>';
  }

  async function loadAccount() {
    const account = await api("/api/dream-invest/account");
    const accountOutput = document.getElementById("di-account-output");
    if (accountOutput) accountOutput.innerHTML = renderAccount(account.account);
    const connection = document.getElementById("di-connection");
    if (connection) {
      connection.textContent = "Alpaca connected · paper";
      connection.classList.add("is-connected");
    }
    return account.account;
  }

  async function loadMarket(symbol, timeframe) {
    const output = document.getElementById("di-main-output");
    if (!output) return;
    output.innerHTML = '<div class="di-loading">Loading ' + esc(symbol) + ' market data…</div>';
    try {
      const params = new URLSearchParams({ symbol: symbol, timeframe: timeframe, limit: "200" });
      const data = await api("/api/dream-invest/bars?" + params.toString());
      output.innerHTML = renderAnalysis(data);
      const form = document.getElementById("di-order-form");
      if (form) form.addEventListener("submit", submitPaperOrder);
    } catch (error) {
      output.innerHTML = '<div class="di-error"><strong>Market analysis unavailable</strong><p>' + esc(error.message) + '</p><button type="button" class="de-action" id="di-retry">Try again</button></div>';
      const retry = document.getElementById("di-retry");
      if (retry) retry.addEventListener("click", function () { loadMarket(symbol, timeframe); });
    }
  }

  async function submitPaperOrder(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.elements.confirm.checked) return;
    const result = document.getElementById("di-order-result");
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    if (result) result.textContent = "Submitting simulated paper order…";
    try {
      const data = await api("/api/dream-invest/orders", {
        method: "POST",
        body: JSON.stringify({
          symbol: form.elements.symbol.value,
          side: form.elements.side.value,
          qty: Number(form.elements.qty.value)
        })
      });
      if (result) result.innerHTML = '<div class="di-success"><strong>Paper order accepted by Alpaca</strong><p>' + esc(data.order.side) + ' ' + esc(data.order.qty) + ' ' + esc(data.order.symbol) + ' · status: ' + esc(data.order.status) + '</p></div>';
    } catch (error) {
      if (result) result.innerHTML = '<div class="di-error"><strong>Paper order was not confirmed</strong><p>' + esc(error.message) + '</p></div>';
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function openDreamInvest() {
    const auth = getAuth();
    if (!auth || !auth.account || !isOwner(auth)) {
      openPanel("DREAM INVEST", "Owner access required", "Dream Invest is currently restricted to the Dream Education owner account.", 
        '<div class="di-error"><p>Sign in with the owner account to access the Alpaca paper trading workspace.</p><button class="de-action primary" type="button" data-action="open" data-panel="signin">Sign in</button></div>');
      return;
    }
    renderBase();
    const output = document.getElementById("di-main-output");
    try {
      const status = await api("/api/dream-invest/status");
      if (!status.configured) throw new Error("Alpaca credentials are missing from Render Environment.");
      await loadAccount();
      if (output) output.innerHTML = '<div class="di-loading">Loading market data…</div>';
      const form = document.getElementById("di-market-form");
      if (form) form.addEventListener("submit", function (event) {
        event.preventDefault();
        loadMarket(form.elements.symbol.value.trim().toUpperCase(), form.elements.timeframe.value);
      });
      await loadMarket("AAPL", "1Day");
    } catch (error) {
      const connection = document.getElementById("di-connection");
      if (connection) connection.textContent = "Connection needs attention";
      if (output) output.innerHTML = '<div class="di-error"><strong>Could not connect to Alpaca</strong><p>' + esc(error.message) + '</p><p>Check that the Render variables are saved and that the API key belongs to the paper account.</p><button type="button" class="de-action" id="di-reconnect">Retry connection</button></div>';
      const retry = document.getElementById("di-reconnect");
      if (retry) retry.addEventListener("click", openDreamInvest);
    }
  }

  document.addEventListener("click", function (event) {
    const trigger = event.target && event.target.closest
      ? event.target.closest("[data-dream-invest-open]")
      : null;
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    openDreamInvest();
  }, true);

  window.openDreamInvest = openDreamInvest;
})();