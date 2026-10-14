/* Dream Invest — simple market prediction and graph; betting remains a separate mode. */
(function () {
  "use strict";

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
        '<section class="di-section" id="di-betting-view" hidden><div class="di-section-head"><div><span class="di-eyebrow">UPCOMING EVENTS · EVIDENCE CHECKED</span><h3>Upcoming match predictions</h3><p class="di-muted">Dream withholds predictions when verified form and independent model agreement are missing.</p></div></div><div class="di-bet-controls"><label>Period<select id="di-bet-period"><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="day_after_tomorrow">Day after tomorrow</option><option value="custom">Choose another date</option><option value="this_week">This week</option><option value="next_week">Next week</option><option value="this_month">This month</option></select></label><label id="di-bet-date-wrap" hidden>Choose date<input type="date" id="di-bet-date" min="2026-10-14"></label><label>Market<select id="di-bet-market"><option value="h2h">Match result</option><option value="btts">Both teams to score</option><option value="over_under">Over/under 2.5 goals</option><option value="correct_score">Correct score</option></select></label><button type="button" class="de-action primary" id="di-load-upcoming">Upcoming predictions</button></div><div id="di-betting-results" aria-live="polite"><p class="di-muted">Only upcoming matches are shown. Predictions appear only when verified form and independent model agreement are available.</p></div></section>' +
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
    if (bars.length < 2) {
      return '<section class="di-section"><p class="di-muted">Not enough market history to draw a graph. Try another symbol or period.</p></section>';
    }

    // The API's walk-forward evidence gate is authoritative. A client-side
    // trend line must never turn a backend HOLD into a directional prediction.
    const indicators = data.indicators || {};
    const trendForecast = forecastForBars(bars);
    const signal = String(indicators.signal || "HOLD").toUpperCase();
    const released = indicators.directional_signal_released === true &&
      (signal === "BUY" || signal === "SELL");
    const expectedDirection = signal === "BUY" ? "UP" : signal === "SELL" ? "DOWN" : null;
    const agreement = Boolean(released && trendForecast && trendForecast.direction === expectedDirection);
    const forecast = agreement ? trendForecast : null;
    const label = forecast
      ? (forecast.direction === "UP" ? "Evidence-screened rise signal" : "Evidence-screened fall signal")
      : !released
        ? "Prediction withheld"
        : "Signals disagree";
    const directionClass = forecast ? forecast.direction.toLowerCase() : "uncertain";
    const changeText = forecast
      ? (forecast.changePct > 0 ? "+" : "") + forecast.changePct.toFixed(2) + "%"
      : "No verified direction";
    const lastBar = bars[bars.length - 1] || {};
    const hitRate = Number(indicators.backtest_hit_rate_pct);
    const hasHitRate = Number.isFinite(hitRate);
    const evidenceSummary = "Walk-forward signals: " + Number(indicators.backtest_signals_available || 0) +
      " · Directional hit rate: " + (hasHitRate ? hitRate.toFixed(1) + "%" : "not available") +
      " · Required: " + Number(indicators.backtest_signals_required || 30) + " signals and " +
      Number(indicators.backtest_hit_rate_required_pct || 55) + "% hit rate";
    const statusMessage = forecast
      ? "The backend evidence gate passed and the recent trend projection agrees with the research signal. This remains uncertain, not financial advice."
      : !released
        ? String(indicators.warning || "The available history did not pass Dream's minimum evidence checks. No rising/falling prediction is being made.")
        : "The backend research signal and recent trend projection disagree. Dream is withholding a directional prediction rather than choosing one.";

    return '<section class="di-signal di-signal-' + esc(directionClass) + '">' +
      '<div><span class="di-eyebrow">MARKET ANALYSIS · EVIDENCE GATED</span><h3>' + esc(label) + '</h3><p>' + esc(statusMessage) + '</p></div>' +
      '<strong>' + esc(changeText) + '</strong></section>' +
      '<section class="di-section"><div class="di-section-head"><h3>' + esc(data.symbol) + ' price graph</h3><span>' + esc(data.timeframe) + '</span></div>' +
      renderPredictionChart(bars, forecast) +
      '<p class="di-muted">Last price: ' + esc(money(Number(lastBar.c))) +
      (forecast ? ' · Trend projection: ' + esc(money(forecast.predicted)) : ' · No future price projection released') +
      '</p><p class="di-muted">' + esc(evidenceSummary) + '</p>' +
      '<p class="di-muted">Latest bar: ' + esc(data.updated_at || lastBar.t || "timestamp unavailable") + '</p></section>' +
      '<p class="di-disclaimer">Historical results and short-term price trends cannot guarantee future direction or profitability. Dream withholds directional calls when evidence is insufficient or signals disagree.</p>';
  }

  async function loadMarket(symbol, timeframe) {
    const output = document.getElementById("di-main-output");
    if (!output) return;
    output.innerHTML = '<div class="di-loading">Loading ' + esc(symbol) + ' market data…</div>';
    try {
      const params = new URLSearchParams({ symbol: symbol, timeframe: timeframe, limit: "200" });
      const data = await api("/api/dream-invest/bars?" + params.toString());
      output.innerHTML = renderAnalysis(data);
    } catch (error) {
      output.innerHTML = '<div class="di-error"><strong>Market analysis unavailable</strong><p>' + esc(error.message) + '</p><button type="button" class="de-action" id="di-retry">Try again</button></div>';
      const retry = document.getElementById("di-retry");
      if (retry) retry.addEventListener("click", function () { loadMarket(symbol, timeframe); });
    }
  }

  async function loadUpcomingPredictions() {
    const output = document.getElementById("di-betting-results");
    if (!output) return;
    output.innerHTML = '<div class="di-loading">Loading upcoming fixtures and checking prediction evidence…</div>';
    const period = document.getElementById("di-bet-period").value;
    const market = document.getElementById("di-bet-market").value;
    const params = new URLSearchParams({ period: period, sport: "soccer", league: "all", market: market });
    if (period === "custom") {
      const chosenDate = document.getElementById("di-bet-date").value;
      if (!chosenDate) {
        output.innerHTML = '<p class="di-muted">Choose a date first.</p>';
        return;
      }
      params.set("date", chosenDate);
    }
    try {
      const data = await api("/api/dream-invest/betting/events?" + params.toString());
      const predictions = Array.isArray(data.predictions) ? data.predictions : [];
      if (!predictions.length) {
        output.innerHTML = '<p class="di-muted">' + esc(data.message || "No upcoming fixtures were returned for this period.") + '</p>' +
          (Array.isArray(data.source_errors) && data.source_errors.length
            ? '<p class="di-muted">' + esc(data.source_errors.join(" · ")) + '</p>' : '');
        return;
      }
      output.innerHTML = '<div class="di-bet-list">' + predictions.map(function (item) {
        const pick = item.market_prediction || {};
        const available = pick.probability_pct != null && Number.isFinite(Number(pick.probability_pct));
        const status = item.prediction_status === "no_verified_consensus" ? "No verified consensus" :
          item.prediction_status === "insufficient_verified_history" ? "Insufficient verified history" :
          available ? "Evidence available" : "Prediction withheld";
        return '<article class="di-bet-row"><strong>' + esc(item.fixture || (item.home_team + " vs " + item.away_team)) + '</strong>' +
          '<span>' + esc(item.league || "Competition") + ' · ' + esc(item.kickoff && Number.isFinite(Date.parse(item.kickoff)) ? new Date(item.kickoff).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" }) : "Kickoff unavailable") + '</span>' +
          '<span>Prediction: ' + esc(available ? pick.label : "No reliable prediction") + '</span>' +
          '<span>Status: ' + esc(status) + '</span>' +
          (available ? '<span>Model estimate: ' + esc(Number(pick.probability_pct).toFixed(1)) + '%</span>' : '') +
          (item.historical_matches_used && typeof item.historical_matches_used === "object"
            ? '<span>Verified recent matches used · ' + esc(item.home_team || "Home") + ': ' +
              esc(Number(item.historical_matches_used.home) || 0) + ' · ' + esc(item.away_team || "Away") + ': ' +
              esc(Number(item.historical_matches_used.away) || 0) + '</span>' : '') +
          (item.prediction_status === "insufficient_verified_history"
            ? '<small>Why no pick? Dream requires at least five recent verified results per team, plus home-team home-match and away-team away-match evidence. Missing data is not a prediction.</small>' : '') +
          '<small>' + esc(item.warning || "Predictions are uncertain and not guaranteed.") + '</small></article>';
      }).join("") + '</div>';
    } catch (error) {
      output.innerHTML = '<div class="di-error"><strong>Upcoming predictions unavailable</strong><p>' + esc(error.message) + '</p></div>';
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
    const periodSelect = document.getElementById("di-bet-period");
    const dateWrap = document.getElementById("di-bet-date-wrap");
    const dateInput = document.getElementById("di-bet-date");
    if (dateInput) {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const part = function (key) { return parts.find(function (item) { return item.type === key; }).value; };
      dateInput.min = part("year") + "-" + part("month") + "-" + part("day");
      dateInput.value = dateInput.min;
    }
    if (periodSelect) periodSelect.addEventListener("change", function () {
      if (dateWrap) dateWrap.hidden = periodSelect.value !== "custom";
    });
    const loadButton = document.getElementById("di-load-upcoming");
    if (loadButton) loadButton.addEventListener("click", loadUpcomingPredictions);
  }

  async function openDreamInvest() {
    const auth = getAuth();
    if (!auth || !auth.success || !auth.account) {
      openPanel("DREAM INVEST", "Sign in to continue", "Dream Invest is available to all Dream Education account holders.",
        '<div class="di-error"><p>Sign in to your Dream Education account to use market analysis and upcoming match predictions.</p><button class="de-action primary" type="button" data-action="open" data-panel="signin">Sign in</button></div>');
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