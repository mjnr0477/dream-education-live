"use strict";
(function () {
  const API = "/api/dream-invest/betting/events";
  const OWNER_EMAIL = "mathiassimiyu52@gmail.com";
  let lastResults = null;
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

  function exportRows(data) {
    return (Array.isArray(data && data.predictions) ? data.predictions : []).map(item => {
      const p = item.model_probabilities || {};
      const fav = item.market_favourite || {};
      return {
        fixture: item.fixture || "", league: item.league || "", kickoff: item.kickoff || "",
        source: item.source || (item.sources || []).join(", "),
        status: item.match_status || item.prediction_status || "",
        prediction: item.market_prediction && item.market_prediction.label || (item.prediction_status === "result_available" ? "Result available" : (fav.outcome || "Not enough verified history")),
        estimated_probability_pct: fav.model_probability_pct ?? "", confidence: item.confidence || "",
        home_score: item.home_score ?? "", away_score: item.away_score ?? "",
        home_win_pct: p.home_win_pct ?? "", draw_pct: p.draw_pct ?? "", away_win_pct: p.away_win_pct ?? "",
        market_type: item.market_prediction && item.market_prediction.type || "",
        market_prediction: item.market_prediction && item.market_prediction.label || "",
        market_probability_pct: item.market_prediction && item.market_prediction.probability_pct != null ? item.market_prediction.probability_pct : "",
        warning: item.warning || ""
      };
    });
  }
  function csvCell(value) {
    let valueText = String(value == null ? "" : value);
    if (/^[=+@\-\t\r]/.test(valueText)) valueText = "'" + valueText;
    return '"' + valueText.replace(/"/g, '""') + '"';
  }
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type + ";charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderExportControls() {
    return '<div class="di-export-actions" aria-label="Export prediction results">' +
      '<button type="button" class="de-action" data-di-export="copy">Copy results</button>' +
      '<button type="button" class="de-action" data-di-export="csv">Download CSV</button>' +
      '<button type="button" class="de-action" data-di-export="json">Download JSON</button>' +
      '<span id="di-export-status" role="status" aria-live="polite"></span></div>';
  }
  async function copyResults(root) {
    const rows = exportRows(lastResults);
    const outputText = rows.map(row => [
      row.fixture + " (" + row.league + ")",
      "Kickoff: " + (row.kickoff || "unavailable"),
      "Prediction/result: " + row.prediction,
      "Estimated probability: " + (row.estimated_probability_pct === "" ? "unavailable" : row.estimated_probability_pct + "%"),
      "Probabilities: home " + (row.home_win_pct === "" ? "n/a" : row.home_win_pct + "%") +
        ", draw " + (row.draw_pct === "" ? "n/a" : row.draw_pct + "%") +
        ", away " + (row.away_win_pct === "" ? "n/a" : row.away_win_pct + "%"),
      "Score: " + (row.home_score === "" ? "—" : row.home_score) + " – " + (row.away_score === "" ? "—" : row.away_score),
      "Confidence: " + (row.confidence || "unavailable"),
      "Source: " + (row.source || "public event feed"),
      "Note: " + (row.warning || "Estimates are uncertain, not guarantees.")
    ].join("\n")).join("\n\n");
    let copied = false;
    try {
      await navigator.clipboard.writeText(outputText);
      copied = true;
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = outputText;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      copied = document.execCommand("copy");
      area.remove();
    }
    const status = root.querySelector("#di-export-status");
    if (status) status.textContent = copied ? "Results copied." : "Copy failed; use Download CSV.";
  }

  function renderPredictions(data) {
    const rows = Array.isArray(data.predictions) ? data.predictions : [];
    const marketTitle = ({ h2h: "Head to Head", btts: "Both Teams to Score", over_under: "Over / Under", correct_score: "Correct Score" })[data.market] || "Prediction";
    const sportScoreCredit = (data.sources || []).includes("SportScore")
      ? '<p class="di-sportscore-credit"><a href="https://sportscore.com/" rel="dofollow" target="_blank">Powered by SportScore</a></p>' : '';
    if (!rows.length) return '<div class="di-empty"><strong>No events available for this selection.</strong><p>' + esc(data.message || "Try another period or choose all leagues.") + '</p></div>' + sportScoreCredit;
    return renderExportControls() + '<div class="di-prediction-summary"><strong>' + rows.length + ' events</strong><span>' + esc(data.sport) + ' · ' + esc(data.league) + ' · Sources: ' + esc((data.sources || []).join(", ") || "public event feeds") + '</span></div>' +
      '<div class="di-bet-list">' + rows.map(item => {
        const favorite = item.market_favourite;
        const source = item.source || (item.sources || []).join(", ") || "Event feed";
        return '<article class="di-bet-row di-prediction-card"><div class="di-prediction-title"><strong>' + esc(item.fixture || "Fixture") + '</strong><span class="di-league-tag">' + esc(item.league || "Competition") + '</span></div>' +
          '<span class="di-kickoff">' + esc(localTime(item.kickoff)) + ' · ' + esc(source) + '</span>' +
          (item.home_score != null && item.away_score != null ? '<div class="di-live-score"><strong>' + esc(item.home_score) + ' – ' + esc(item.away_score) + '</strong><small>' + esc(item.match_status || "Result") + '</small></div>' : '') +
          '<div class="di-pick"><span>' + esc(item.prediction_status === "result_available" ? "Recorded result" : marketTitle) + '</span><strong>' +
          esc(item.market_prediction ? item.market_prediction.label :
            item.prediction_status === "result_available" ? "Result available" : favorite ? favorite.outcome : "Not enough verified history") + '</strong>' +
          (item.prediction_status === "result_available" ? '<small>Final score: ' + esc(item.home_score) + ' – ' + esc(item.away_score) + '</small>' :
            item.market_prediction && item.market_prediction.probability_pct != null ? '<small>' + esc(item.market_prediction.probability_pct) + '% estimated probability</small>' : '') + '</div>' +
          (data.market === "h2h" && item.model_probabilities ? '<div class="di-outcomes"><span>Home <b>' + esc(item.model_probabilities.home_win_pct) + '%</b></span>' +
            (Number(item.model_probabilities.draw_pct) > 0 ? '<span>Draw <b>' + esc(item.model_probabilities.draw_pct) + '%</b></span>' : '') +
            '<span>Away <b>' + esc(item.model_probabilities.away_win_pct) + '%</b></span></div>' : '') +
          '<small class="di-prediction-note">Estimate from recent results · Not guaranteed</small></article>';
      }).join("") + '</div>' + sportScoreCredit;
  }
  async function loadLeagues(root, sport, period, keepValue) {
    const league = root.querySelector("#di-simple-league");
    if (!league) return;
    league.innerHTML = '<option value="all">All leagues</option>';
    try {
      const data = await api({ period: period || "today", sport, league: "all", optionsOnly: "1" });
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
    const market = root.querySelector("#di-simple-market").value || "h2h";
    const direction = root.querySelector("#di-simple-direction").value || "over";
    const goalLine = root.querySelector("#di-simple-goal-line").value || "2.5";
    if (button) { button.disabled = true; button.textContent = "Finding events…"; }
    if (output) output.innerHTML = '<div class="di-loading">Finding public fixtures, recent results and team form…</div>';
    try {
      const data = await api({ period, sport, league, market, direction, goalLine });
      lastResults = data;
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
      '<label>Sport<select id="di-simple-sport"><option value="soccer">Soccer</option><option value="basketball">Basketball</option><option value="tennis">Tennis</option><option value="cricket">Cricket</option></select></label>' +
      '<label>League<select id="di-simple-league"><option value="all">All leagues</option></select></label>' +
      '<label>Prediction type<select id="di-simple-market"><option value="h2h">Head to Head (1X2)</option><option value="btts">Both Teams to Score</option><option value="over_under">Over / Under</option><option value="correct_score">Correct Score</option></select></label>' +
      '<label id="di-market-direction-wrap">Goals<select id="di-simple-direction"><option value="over">Over</option><option value="under">Under</option></select></label>' +
      '<label id="di-market-line-wrap">Goal line<select id="di-simple-goal-line"><option value="1.5">1.5</option><option value="2.5" selected>2.5</option><option value="3.5">3.5</option></select></label>' +
      '<button type="button" class="de-action primary" id="di-simple-predict">Show predictions</button>';
    const old = root.querySelector("#di-betting-results");
    if (old) old.innerHTML = '<p class="di-muted">Choose a period, sport and optionally a league. Dream uses public fixtures and recent results; no OddsPapi key is required.</p>';
    const sport = root.querySelector("#di-simple-sport");
    const period = root.querySelector("#di-simple-period");
    const market = root.querySelector("#di-simple-market");
    const directionWrap = root.querySelector("#di-market-direction-wrap");
    const lineWrap = root.querySelector("#di-market-line-wrap");
    const refreshMarketControls = () => {
      const isSoccer = sport.value === "soccer";
      Array.from(market.options).forEach(option => { option.disabled = !isSoccer && option.value !== "h2h"; });
      if (!isSoccer) market.value = "h2h";
      directionWrap.hidden = market.value !== "over_under";
      lineWrap.hidden = market.value !== "over_under";
    };
    sport.addEventListener("change", () => { refreshMarketControls(); loadLeagues(root, sport.value, period.value); });
    period.addEventListener("change", () => loadLeagues(root, sport.value, period.value, root.querySelector("#di-simple-league").value));
    market.addEventListener("change", refreshMarketControls);
    root.querySelector("#di-simple-predict").addEventListener("click", () => showPredictions(root));
    refreshMarketControls();
    loadLeagues(root, sport.value, period.value);
  }

  document.addEventListener("click", event => {
    const button = event.target && event.target.closest ? event.target.closest("[data-di-export]") : null;
    if (!button || !lastResults) return;
    const root = document.getElementById("di-betting-view");
    if (!root) return;
    const rows = exportRows(lastResults);
    if (!rows.length) return;
    const kind = button.getAttribute("data-di-export");
    if (kind === "copy") {
      copyResults(root);
      return;
    }
    if (kind === "csv") {
      const headers = Object.keys(rows[0]);
      const csv = [headers.map(csvCell).join(","), ...rows.map(row => headers.map(key => csvCell(row[key])).join(","))].join("\r\n");
      downloadFile("dream-invest-results-" + new Date().toISOString().slice(0, 10) + ".csv", "\uFEFF" + csv, "text/csv");
    } else if (kind === "json") {
      downloadFile("dream-invest-results-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({
        generated_at: new Date().toISOString(), period: root.querySelector("#di-simple-period")?.value || "",
        sport: lastResults.sport || "", league: lastResults.league || "", sources: lastResults.sources || [],
        note: "Model estimates are uncertain and are not guaranteed outcomes.", results: rows
      }, null, 2), "application/json");
    }
    const status = root.querySelector("#di-export-status");
    if (status) status.textContent = kind === "csv" ? "CSV download started." : "JSON download started.";
  });

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
