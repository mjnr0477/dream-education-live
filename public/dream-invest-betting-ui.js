"use strict";
(function () {
  const API = "/api/dream-invest/betting/events";
  const OWNER_EMAIL = "mathiassimiyu52@gmail.com";
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]);
  }
  function authHeaders() {
    let auth = null;
    try { auth = JSON.parse(localStorage.getItem("dream_education_auth") || "null"); } catch (_) {}
    const headers = { Accept: "application/json" };
    const token = auth && auth.session && auth.session.access_token;
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }
  async function api(params) {
    const response = await fetch(API + "?" + new URLSearchParams(params), { credentials: "same-origin", headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.error || "Could not load predictions.");
    return data;
  }
  function localTime(value) {
    if (!value) return "Kickoff time unavailable";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  function renderPredictions(data) {
    const rows = Array.isArray(data.predictions) ? data.predictions : [];
    const sportScoreCredit = (data.sources || []).includes("SportScore")
      ? '<p class="di-sportscore-credit"><a href="https://sportscore.com/" rel="dofollow" target="_blank">Powered by SportScore</a></p>' : '';
    if (!rows.length) return '<div class="di-empty"><strong>No events available for this selection.</strong><p>' + esc(data.message || "Try another period or choose all leagues.") + '</p></div>' + sportScoreCredit;
    return '<div class="di-prediction-summary"><strong>' + rows.length + ' events</strong><span>' + esc(data.sport) + ' · ' + esc(data.league) + ' · Sources: ' + esc((data.sources || []).join(", ") || "public event feeds") + '</span></div>' +
      '<div class="di-bet-list">' + rows.map(item => {
        const outcomes = Array.isArray(item.available_outcomes) ? item.available_outcomes : [];
        const favorite = item.market_favourite;
        const source = item.source || (item.sources || []).join(", ") || "Event feed";
        return '<article class="di-bet-row di-prediction-card"><div class="di-prediction-title"><strong>' + esc(item.fixture || "Fixture") + '</strong><span class="di-league-tag">' + esc(item.league || "Competition") + '</span></div>' +
          '<span class="di-kickoff">' + esc(localTime(item.kickoff)) + ' · ' + esc(source) + '</span>' +
          (item.home_score != null && item.away_score != null ? '<div class="di-live-score"><strong>' + esc(item.home_score) + ' – ' + esc(item.away_score) + '</strong><small>' + esc(item.match_status || "Result") + '</small></div>' : '') +
          '<div class="di-pick"><span>Prediction status</span><strong>' + esc(favorite ? favorite.outcome : "Not enough verified data") + '</strong>' +
          (favorite ? '<b>' + esc(favorite.decimal_odds) + ' odds</b><small>' + esc(favorite.model_probability_pct) + '% normalized market probability</small>' : '<small>This event is listed, but Dream will not invent a prediction without fresh, verified market data.</small>') + '</div>' +
          (outcomes.length ? '<div class="di-outcomes">' + outcomes.map(outcome => '<span>' + esc(outcome.outcome) + ' <b>' + esc(outcome.decimal_odds) + '</b></span>').join("") + '</div>' : '') +
          '<small class="di-prediction-note">Probabilities are estimates, not guarantees. ' + esc(item.warning || "") + '</small></article>';
      }).join("") + '</div>' + sportScoreCredit;
  }
  async function loadLeagues(root, sport, keepValue) {
    const league = root.querySelector("#di-simple-league");
    if (!league) return;
    league.innerHTML = '<option value="all">All leagues</option>';
    try {
      const data = await api({ period: "today", sport, league: "all", optionsOnly: "1" });
      (data.leagues || []).forEach(item => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        league.appendChild(option);
      });
      if (keepValue && Array.from(league.options).some(option => option.value === keepValue)) league.value = keepValue;
    } catch (error) {
      const output = root.querySelector("#di-betting-results");
      if (output) output.innerHTML = '<div class="di-error">' + esc(error.message) + '</div>';
    }
  }
  async function showPredictions(root) {
    const output = root.querySelector("#di-betting-results");
    const button = root.querySelector("#di-simple-predict");
    const period = root.querySelector("#di-simple-period").value;
    const sport = root.querySelector("#di-simple-sport").value;
    const league = root.querySelector("#di-simple-league").value || "all";
    if (button) { button.disabled = true; button.textContent = "Finding events…"; }
    if (output) output.innerHTML = '<div class="di-loading">Finding events and available odds automatically…</div>';
    try {
      const data = await api({ period, sport, league });
      if (output) output.innerHTML = renderPredictions(data);
      const status = root.querySelector("#di-betting-status");
      if (status) status.textContent = data.count + " events found";
    } catch (error) {
      if (output) output.innerHTML = '<div class="di-error"><strong>Predictions unavailable</strong><p>' + esc(error.message) + '</p></div>';
    } finally {
      if (button) { button.disabled = false; button.textContent = "Show predictions"; }
    }
  }
  function enhance(root) {
    const controls = root.querySelector(".di-bet-controls");
    if (!controls || controls.dataset.simplePredictions === "1") return;
    controls.dataset.simplePredictions = "1";
    controls.innerHTML =
      '<label>Period<select id="di-simple-period"><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="week">This week</option><option value="month">This month</option></select></label>' +
      '<label>Sport<select id="di-simple-sport"><option value="soccer">Soccer</option><option value="basketball">Basketball</option><option value="tennis">Tennis</option><option value="cricket">Cricket</option><option value="rugby">Rugby</option><option value="volleyball">Volleyball</option><option value="ice hockey">Ice hockey</option></select></label>' +
      '<label>League<select id="di-simple-league"><option value="all">All leagues</option></select></label>' +
      '<button type="button" class="de-action primary" id="di-simple-predict">Show predictions</button>';
    const old = root.querySelector("#di-betting-results");
    if (old) old.innerHTML = '<p class="di-muted">Choose a period, sport and optionally a league. Dream will find the events and odds for you.</p>';
    const sport = root.querySelector("#di-simple-sport");
    sport.addEventListener("change", () => loadLeagues(root, sport.value));
    root.querySelector("#di-simple-predict").addEventListener("click", () => showPredictions(root));
    loadLeagues(root, sport.value);
  }
  const observer = new MutationObserver(() => {
    const root = document.getElementById("di-betting-view");
    if (root) enhance(root);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", event => {
    const button = event.target && event.target.closest ? event.target.closest('[data-di-mode="betting"]') : null;
    if (!button) return;
    const root = document.getElementById("di-betting-view");
    if (root) enhance(root);
  }, true);
})();
