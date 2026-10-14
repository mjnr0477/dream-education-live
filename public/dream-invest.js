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

  function money(value, currency) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(number);
  }

  function renderBase() {
    openPanel("DREAM INVEST", "Dream Invest", "Choose a market and period to get a simple model-based prediction and price graph.",
      '<div class="dream-invest">' +
        '<nav class="di-mode-switch" aria-label="Dream Invest mode"><button type="button" class="de-action primary" data-di-mode="trading">Trading</button><button type="button" class="de-action" data-di-mode="betting">Betting</button></nav>' +
        '<section class="di-section" id="di-betting-view" hidden><div class="di-section-head"><div><span class="di-eyebrow">SPORTS DATA · ODDSPAPI</span><h3>Betika predictions</h3><p class="di-muted">Predictions are estimates from available odds, not guarantees. Betting is not automated.</p></div><span class="di-status" id="di-betting-status">Checking OddsPapi…</span></div><div class="di-bet-controls"><button type="button" class="de-action" id="di-load-sports">Load sports</button><label>Sport ID<input id="di-sport-id" maxlength="60" placeholder="Choose from sports list"></label><button type="button" class="de-action" id="di-load-tournaments">Load tournaments</button><label>Tournament IDs<input id="di-tournament-ids" maxlength="500" placeholder="IDs separated by commas"></label><label>Bookmaker<input id="di-bookmaker" maxlength="80" value="betika" placeholder="betika"></label><button type="button" class="de-action primary" id="di-load-odds">Get odds & predictions</button></div><div id="di-betting-results" aria-live="polite"></div><p class="di-warning">OddsPapi supplies sports data; this integration does not place bets on Betika. Verify fixtures, bookmaker availability and odds before making any independent decision.</p></section>' +
        '<div id="di-trading-view">' +
          '<form class="di-search" id="di-market-form">' +
            '<label for="di-symbol">Market symbol</label><input id="di-symbol" name="symbol" maxlength="12" value="AAPL" required autocapitalize="characters" placeholder="e.g. AAPL">' +
            '<label for="di-timeframe">Prediction period</label><select id="di-timeframe" name="timeframe"><option value="1Min">1 minute</option><option value="5Min">5 minutes</option><option value="15Min">15 minutes</option><option value="1Hour">1 hour</option><option value="1Day" selected>1 day</option></select>' +
            '<button class="de-action primary" type="submit">Predict market</button>' +
          '</form>' +
          '<div id="di-main-output" aria-live="polite"><div class="di-loading">Choose a market and predict.</div></div>' +
        '</div></div>');
  }

  function forecastForBars(bars) {
    const values = (Array.isArray(bars) ? bars : []).map(function (bar) { return Number(bar.c); }).filter(Number.isFinite);
    const sample = values.slice(-20);
    if (sample.length < 5) return null;
    const meanX = (sample.length - 1) / 2;
    const meanY = sample.reduce(function (sum, value) { return sum + value; }, 0) / sample.length;
    let numerator = 0, denominator = 0;
    sample.forEach(function (value, index) {
      numerator += (index - meanX) * (value - meanY);
      denominator += (index - meanX) * (index - meanX);
    });
    const slope = denominator ? numerator / denominator : 0;
    const last = sample[sample.length - 1];
    const predicted = last + slope * 5;
    const changePct = last ? ((predicted - last) / last) * 100 : 0;
    const direction = changePct > 0.15 ? "UP" : changePct < -0.15 ? "DOWN" : "SIDEWAYS";
    return { last: last, predicted: predicted, changePct: changePct, direction: direction };
  }

  function renderPredictionChart(bars, forecast) {
    const values = (Array.isArray(bars) ? bars : []).map(function (bar) { return Number(bar.c); }).filter(Number.isFinite);
    if (values.length < 2) return '<div class="di-empty">Not enough market history to draw a graph.</div>';
    const history = values.slice(-60);
    const future = forecast ? [history[history.length - 1], forecast.predicted] : [];
    const all = history.concat(future);
    const min = Math.min.apply(null, all), max = Math.max.apply(null, all);
    const range = max - min || Math.abs(max) * 0.001 || 1;
    const width = 720, height = 240, pad = 18;
    const y = function (value) { return height - pad - ((value - min) / range) * (height - pad * 2); };
    const historyPoints = history.map(function (value, index) {
      return (pad + index / Math.max(1, history.length + (forecast ? 1 : 0) - 1) * (width - pad * 2)) + "," + y(value);
    }).join(" ");
    let forecastLine = "";
    if (forecast) {
      const lastX = pad + (history.length - 1) / Math.max(1, history.length) * (width - pad * 2);
      const nextX = width - pad;
      forecastLine = '<line x1="' + lastX + '" y1="' + y(history[history.length - 1]) + '" x2="' + nextX + '" y2="' + y(forecast.predicted) + '" class="di-forecast-line"/>' +
        '<circle cx="' + nextX + '" cy="' + y(forecast.predicted) + '" r="4" class="di-forecast-point"/>';
    }
    return '<div class="di-chart-wrap"><svg class="di-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Historical market price with estimated forecast">' +
      '<line x1="18" y1="55" x2="702" y2="55" class="di-gridline"/><line x1="18" y1="120" x2="702" y2="120" class="di-gridline"/><line x1="18" y1="185" x2="702" y2="185" class="di-gridline"/>' +
      '<polyline points="' + historyPoints + '" class="' + (history[history.length - 1] >= history[0] ? "di-price-line-up" : "di-price-line-down") + '"/>' + forecastLine +
      '</svg><div class="di-chart-labels"><span>History · low ' + esc(money(min)) + '</span><span>' + (forecast ? "Forecast · " + esc(money(forecast.predicted)) : "high " + esc(money(max))) + '</span></div></div>';
  }

  function renderAnalysis(data) {
    const bars = Array.isArray(data.bars) ? data.bars : [];
    const forecast = forecastForBars(bars);
    if (!forecast) return '<section class="di-section"><p class="di-muted">Not enough recent data to estimate this market. Try another symbol or period.</p></section>';
    const directionClass = forecast.direction.toLowerCase();
    const label = forecast.direction === "UP" ? "Expected to rise" : forecast.direction === "DOWN" ? "Expected to fall" : "No clear direction";
    const changeText = (forecast.changePct > 0 ? "+" : "") + forecast.changePct.toFixed(2) + "%";
    const lastBar = bars[bars.length - 1] || {};
    return '<section class="di-signal di-signal-' + esc(directionClass) + '">' +
      '<div><span class="di-eyebrow">MARKET PREDICTION · ESTIMATE</span><h3>' + esc(label) + '</h3><p>Estimated move over the next 5 selected periods</p></div>' +
      '<strong>' + esc(changeText) + '</strong></section>' +
      '<section class="di-section"><div class="di-section-head"><h3>' + esc(data.symbol) + ' price graph</h3><span>' + esc(data.timeframe) + '</span></div>' +
      renderPredictionChart(bars, forecast) +
      '<p class="di-muted">Last price: ' + esc(money(forecast.last)) + ' · Estimated price: ' + esc(money(forecast.predicted)) + '</p></section>' +
      '<p class="di-disclaimer">Estimate based on recent prices, not a guarantee. Markets can move unexpectedly.</p>';
  }

  async function loadAccount() {
    const account = await api("/api/dream-invest/account");
    const accountOutput = document.getElementById("di-account-output");
    if (accountOutput) {
      accountOutput.innerHTML = renderAccount(account.account);
      const refresh = document.getElementById("di-refresh-account");
      if (refresh) refresh.addEventListener("click", async function () {
        refresh.disabled = true;
        refresh.textContent = "Refreshing…";
        try {
          await loadAccount();
        } catch (error) {
          refresh.textContent = "Retry refresh";
          const note = document.createElement("p");
          note.className = "di-error";
          note.textContent = error.message;
          accountOutput.appendChild(note);
        }
      });
    }
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

  function unwrapRows(payload) {
    if (Array.isArray(payload)) return payload;
    for (const key of ["data", "results", "items", "sports", "tournaments", "fixtures", "odds"]) {
      if (Array.isArray(payload && payload[key])) return payload[key];
    }
    if (payload && payload.data && typeof payload.data === "object") return unwrapRows(payload.data);
    return [];
  }

  function renderRows(rows, kind) {
    if (!rows.length) return '<p class="di-muted">No rows returned. Check the IDs, provider response and API permissions.</p>';
    return '<div class="di-bet-list">' + rows.slice(0, 50).map(function (row) {
      const id = row.id || row.sportId || row.sport_id || row.tournamentId || row.tournament_id || row.fixtureId || row.fixture_id || "—";
      const name = row.name || row.title || row.label || row.fixtureName || row.eventName ||
        [row.homeTeam || row.home || row.home_team, row.awayTeam || row.away || row.away_team].filter(Boolean).join(" vs ") || "Sports item";
      const odds = row.decimalOdds || row.decimal_odds || row.odds || row.price;
      return '<article class="di-bet-row"><strong>' + esc(name) + '</strong><span>ID: ' + esc(id) + '</span>' +
        (odds && typeof odds !== "object" ? '<span>Odds: ' + esc(odds) + '</span>' : '') +
        (kind === "odds" ? '<span class="di-muted">Check bookmaker and kickoff before using.</span>' : '') + '</article>';
    }).join("") + '</div>';
  }

  async function loadBettingData(path, params) {
    const output = document.getElementById("di-betting-results");
    if (output) output.innerHTML = '<div class="di-loading">Loading sports data…</div>';
    try {
      const query = new URLSearchParams(params || {});
      const data = await api(path + (query.toString() ? "?" + query.toString() : ""));
      if (output) {
        if (path.endsWith("/odds")) {
          const predictions = Array.isArray(data.predictions) ? data.predictions : [];
          output.innerHTML = predictions.length
            ? '<div class="di-bet-list">' + predictions.map(function (item) {
                const favourite = item.market_favourite;
                return '<article class="di-bet-row"><strong>' + esc(item.fixture) + '</strong>' +
                  '<span>' + esc(item.kickoff || "Kickoff not supplied") + '</span>' +
                  '<span>Market favourite: ' + esc(favourite ? favourite.outcome : "Unavailable") + '</span>' +
                  '<span>Implied probability: ' + esc(favourite ? favourite.implied_probability_pct + "%" : "Unavailable") + '</span>' +
                  '<span>Odds: ' + esc(favourite ? favourite.decimal_odds : "Unavailable") + '</span>' +
                  '<small>' + esc(item.warning || "") + '</small></article>';
              }).join("") + '</div>'
            : renderRows(unwrapRows(data.data), "odds");
        } else {
          output.innerHTML = renderRows(unwrapRows(data.data), path.endsWith("/sports") ? "sports" : "tournaments");
        }
      }
      return data;
    } catch (error) {
      if (output) output.innerHTML = '<div class="di-error"><strong>Sports data unavailable</strong><p>' + esc(error.message) + '</p></div>';
      return null;
    }
  }

  function setupBettingMode() {
    const modeButtons = Array.from(document.querySelectorAll("[data-di-mode]"));
    const trading = document.getElementById("di-trading-view");
    const betting = document.getElementById("di-betting-view");
    modeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const isBetting = button.getAttribute("data-di-mode") === "betting";
        if (trading) trading.hidden = isBetting;
        if (betting) betting.hidden = !isBetting;
        modeButtons.forEach(function (item) { item.classList.toggle("primary", item === button); });
      });
    });
    const sportsButton = document.getElementById("di-load-sports");
    if (sportsButton) sportsButton.addEventListener("click", async function () {
      const data = await loadBettingData("/api/dream-invest/betting/sports");
      if (data) {
        const rows = unwrapRows(data.data);
        const status = document.getElementById("di-betting-status");
        if (status) status.textContent = "OddsPapi connected · " + rows.length + " sports";
      }
    });
    const tournamentsButton = document.getElementById("di-load-tournaments");
    if (tournamentsButton) tournamentsButton.addEventListener("click", function () {
      const sportId = document.getElementById("di-sport-id").value.trim();
      if (!sportId) {
        const output = document.getElementById("di-betting-results");
        if (output) output.innerHTML = '<p class="di-error">Load sports first, then enter a sport ID.</p>';
        return;
      }
      loadBettingData("/api/dream-invest/betting/tournaments", { sportId: sportId });
    });
    const oddsButton = document.getElementById("di-load-odds");
    if (oddsButton) oddsButton.addEventListener("click", function () {
      const tournamentIds = document.getElementById("di-tournament-ids").value.trim();
      const bookmaker = document.getElementById("di-bookmaker").value.trim() || "betika";
      if (!tournamentIds) {
        const output = document.getElementById("di-betting-results");
        if (output) output.innerHTML = '<p class="di-error">Enter one or more tournament IDs first.</p>';
        return;
      }
      loadBettingData("/api/dream-invest/betting/odds", { tournamentIds: tournamentIds, bookmaker: bookmaker });
    });
    api("/api/dream-invest/betting/status").then(function (data) {
      const status = document.getElementById("di-betting-status");
      if (status) status.textContent = data.configured ? "OddsPapi key ready" : "API key missing";
    }).catch(function (error) {
      const status = document.getElementById("di-betting-status");
      if (status) status.textContent = error.message || "Sign in required";
    });
  }

  async function openDreamInvest() {
    const auth = getAuth();
    if (!auth || !auth.account || !isOwner(auth)) {
      openPanel("DREAM INVEST", "Owner access required", "Dream Invest is currently restricted to the Dream Education owner account.",
        '<div class="di-error"><p>Sign in with the owner account to access market predictions.</p><button class="de-action primary" type="button" data-action="open" data-panel="signin">Sign in</button></div>');
      return;
    }
    renderBase();
    setupBettingMode();
    const output = document.getElementById("di-main-output");
    const form = document.getElementById("di-market-form");
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      const symbol = String(form.elements.symbol.value || "").trim().toUpperCase();
      if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
        if (output) output.innerHTML = '<div class="di-error">Enter a valid market symbol.</div>';
        return;
      }
      loadMarket(symbol, form.elements.timeframe.value);
    });
    if (output) output.innerHTML = '<div class="di-loading">Choose a market and period, then tap Predict market.</div>';
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