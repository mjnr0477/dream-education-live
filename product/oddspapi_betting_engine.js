"use strict";

const API_BASE = "https://api.oddspapi.io";

function text(value, max = 160) {
  return String(value == null ? "" : value).trim().slice(0, max);
}
function isOwner(account) {
  return Boolean(account && (account.owner_account === true ||
    String(account.email || "").trim().toLowerCase() === "mathiassimiyu52@gmail.com"));
}
function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["data", "results", "items", "sports", "tournaments", "fixtures", "odds"]) {
    if (Array.isArray(payload && payload[key])) return payload[key];
  }
  return [];
}
function numericOdds(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 && n < 10000 ? n : null;
}
function buildOddsPrediction(payload) {
  const rows = rowsOf(payload);
  const predictions = [];
  for (const row of rows) {
    const odds = [];
    const seen = new Set();
    function walk(value, path, depth) {
      if (!value || typeof value !== "object" || depth > 5) return;
      if (Array.isArray(value)) {
        value.slice(0, 40).forEach((item, index) => walk(item, path + "[" + index + "]", depth + 1));
        return;
      }
      for (const [key, item] of Object.entries(value)) {
        const odd = numericOdds(item);
        if (odd !== null && /odd|price|decimal/i.test(key)) {
          const label = text(value.name || value.label || value.outcome || key, 80);
          const identity = label + "|" + odd;
          if (!seen.has(identity)) { seen.add(identity); odds.push({ outcome: label, decimal_odds: odd, implied_probability_pct: Number((100 / odd).toFixed(2)) }); }
        } else if (item && typeof item === "object") {
          walk(item, path ? path + "." + key : key, depth + 1);
        }
      }
    }
    walk(row, "", 0);
    const likely = odds.slice().sort((a, b) => b.implied_probability_pct - a.implied_probability_pct)[0] || null;
    predictions.push({
      fixture: text(row.name || row.fixtureName || row.eventName || row.match || row.title ||
        [row.participant1Name || row.homeTeam || row.home || row.home_team, row.participant2Name || row.awayTeam || row.away || row.away_team].filter(Boolean).join(" vs ") || "Fixture", 180),
      fixture_id: text(row.id || row.fixtureId || row.fixture_id, 100) || null,
      kickoff: text(row.startTime || row.start_time || row.kickoff || row.date, 80) || null,
      available_outcomes: odds,
      market_favourite: likely,
      method: "Highest bookmaker-implied probability among odds fields returned by the provider",
      warning: "This is an odds-based heuristic, not a calibrated model or guarantee. Missing or differently shaped odds may prevent a prediction."
    });
  }
  return predictions;
}
function registerOddsPapiRoutes(app, options = {}) {
  const getAuthenticatedAccount = options.getAuthenticatedAccount;
  async function requireOwner(req, res) {
    if (typeof getAuthenticatedAccount !== "function") {
      res.status(503).json({ success: false, error: "Dream Education authentication is unavailable." });
      return false;
    }
    try {
      const auth = await getAuthenticatedAccount(req);
      if (!auth || !auth.success || !auth.account) {
        res.status(Number(auth && auth.status) || 401).json({ success: false, error: auth && auth.error || "Sign in first." });
        return false;
      }
      if (!isOwner(auth.account)) {
        res.status(403).json({ success: false, error: "Dream Invest betting tools are restricted to the owner account." });
        return false;
      }
      return true;
    } catch (_) {
      res.status(503).json({ success: false, error: "Could not verify your account." });
      return false;
    }
  }
  async function requestProvider(path, query = {}) {
    const key = text(process.env.ODDSPAPI_API_KEY, 500);
    if (!key) throw Object.assign(new Error("OddsPapi API key is not configured. Add ODDSPAPI_API_KEY in Render Environment."), { status: 503 });
    const params = new URLSearchParams();
    params.set("apiKey", key);
    for (const [name, value] of Object.entries(query)) if (value !== undefined && value !== null && String(value).trim()) params.set(name, String(value).trim());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(API_BASE + path + "?" + params.toString(), { headers: { Accept: "application/json" }, signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const providerCode = text(body && (body.code || body.errorCode), 80);
        const providerMessage = text(body && (body.message || body.error || body.details), 180);
        let message;
        if (response.status === 401 || response.status === 403) {
          message = "OddsPapi rejected the API key or its permissions (HTTP " + response.status + "). Check that the key is active and belongs to the expected account.";
        } else if (response.status === 429) {
          message = "OddsPapi rate/request limit reached (HTTP 429)." + (providerMessage ? " " + providerMessage : " Check your OddsPapi request quota in the account dashboard.");
        } else if (response.status === 400) {
          message = "OddsPapi rejected the request (HTTP 400)." + (providerMessage ? " " + providerMessage : "");
        } else {
          message = "OddsPapi request failed (HTTP " + response.status + ")." + (providerMessage ? " " + providerMessage : " Check provider status and API permissions.");
        }
        if (providerCode) message += " Provider code: " + providerCode + ".";
        throw Object.assign(new Error(message), { status: response.status === 429 ? 429 : response.status === 400 ? 400 : response.status === 401 || response.status === 403 ? response.status : 502 });
      }
      return body;
    } finally { clearTimeout(timer); }
  }
  async function respond(res, path, query) {
    try { return res.json({ success: true, data: await requestProvider(path, query) }); }
    catch (error) {
      const status = error && error.name === "AbortError" ? 504 : Number(error && error.status) || 502;
      return res.status(status).json({ success: false, error: error && error.name === "AbortError" ? "OddsPapi request timed out. Try again." : text(error && error.message, 240) || "OddsPapi request failed." });
    }
  }
  app.get("/api/dream-invest/betting/status", async (req, res) => {
    if (!await requireOwner(req, res)) return;
    return res.json({ success: true, configured: Boolean(text(process.env.ODDSPAPI_API_KEY, 500)), provider: "OddsPapi", bet_placement_enabled: false, message: text(process.env.ODDSPAPI_API_KEY, 500) ? "OddsPapi key is configured. Bet placement is not connected." : "Add ODDSPAPI_API_KEY in Render Environment." });
  });
  app.get("/api/dream-invest/betting/events", async (req, res) => {
    if (!await requireOwner(req, res)) return;
    try {
      const period = text(req.query && req.query.period, 20).toLowerCase() || "today";
      const sportQuery = text(req.query && req.query.sport, 80).toLowerCase() || "soccer";
      const leagueQuery = text(req.query && req.query.league, 120).toLowerCase() || "all";
      const optionsOnly = String(req.query && req.query.optionsOnly || "") === "1";
      if (!["today", "tomorrow", "week", "month"].includes(period)) {
        return res.status(400).json({ success: false, error: "Choose Today, Tomorrow, This Week, or This Month." });
      }
      const sports = rowsOf(await requestProvider("/v4/sports"));
      const sport = sports.find(item => {
        const label = text(item.sportName || item.name || item.slug || item.sportSlug, 100).toLowerCase();
        return sportQuery === "soccer" || sportQuery === "football"
          ? /soccer|football/.test(label)
          : label === sportQuery || label.includes(sportQuery);
      });
      if (!sport) {
        return res.status(404).json({ success: false, error: "That sport is not available from OddsPapi. Choose a sport supported by your account." });
      }
      const sportId = sport.sportId || sport.id || sport.sport_id;
      const tournaments = rowsOf(await requestProvider("/v4/tournaments", { sportId }));
      const leagueRows = tournaments.map(item => ({
        id: item.tournamentId || item.id,
        name: text(item.tournamentName || item.name || item.tournamentSlug, 120)
      })).filter(item => item.id != null && item.name);
      if (optionsOnly) {
        return res.json({ success: true, sport: text(sport.sportName || sport.name || sportQuery, 80), leagues: leagueRows });
      }
      const selected = leagueQuery === "all" ? leagueRows : leagueRows.filter(item =>
        item.name.toLowerCase() === leagueQuery || item.name.toLowerCase().includes(leagueQuery));
      if (!selected.length) {
        return res.json({ success: true, period, sport: text(sport.sportName || sport.name || sportQuery, 80),
          league: leagueQuery, bookmaker: "pinnacle", count: 0, predictions: [],
          message: "No matching league is available from OddsPapi." });
      }
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      const part = key => parts.find(item => item.type === key).value;
      const today = part("year") + "-" + part("month") + "-" + part("day");
      const addDays = (date, days) => {
        const value = new Date(date + "T12:00:00Z");
        value.setUTCDate(value.getUTCDate() + days);
        return value.toISOString().slice(0, 10);
      };
      let fromDate = period === "tomorrow" ? addDays(today, 1) : today;
      let toDate = period === "tomorrow" ? fromDate : period === "week" ? addDays(today, 6) :
        period === "month" ? today.slice(0, 8) + new Date(Date.UTC(Number(today.slice(0,4)), Number(today.slice(5,7)), 0)).getUTCDate().toString().padStart(2, "0") : today;
      const start = new Date(fromDate + "T00:00:00+03:00").getTime();
      const end = new Date(toDate + "T23:59:59+03:00").getTime();
      const ids = selected.map(item => item.id);
      const providerData = await requestProvider("/v4/odds-by-tournaments", { bookmaker: "pinnacle", tournamentIds: ids.join(",") });
      const fixtures = rowsOf(providerData).filter(row => {
        const time = Date.parse(row.startTime || row.start_time || row.kickoff || row.date || "");
        return Number.isFinite(time) && time >= start && time <= end;
      });
      const selectedIds = new Set(ids.map(String));
      const scoped = fixtures.filter(row => !row.tournamentId || selectedIds.has(String(row.tournamentId)));
      const predictions = buildOddsPrediction(scoped).map((item, index) => ({
        ...item,
        league: text(scoped[index] && (scoped[index].tournamentName || scoped[index].tournamentSlug) ||
          selected.find(entry => String(entry.id) === String(scoped[index] && scoped[index].tournamentId))?.name, 120) || "Competition",
        bookmaker: "Pinnacle"
      }));
      return res.json({ success: true, period, from: fromDate, to: toDate,
        sport: text(sport.sportName || sport.name || sportQuery, 80),
        league: leagueQuery === "all" ? "All leagues" : text(selected[0].name, 120),
        bookmaker: "Pinnacle", count: predictions.length, predictions,
        message: predictions.length ? "" : "No fixtures with odds were returned for this period and selection." });
    } catch (error) {
      const status = error && error.name === "AbortError" ? 504 : Number(error && error.status) || 502;
      return res.status(status).json({ success: false, error: error && error.name === "AbortError" ? "OddsPapi request timed out. Try again." : text(error && error.message, 240) || "OddsPapi request failed." });
    }
  });
  app.get("/api/dream-invest/betting/sports", async (req, res) => {
    if (!await requireOwner(req, res)) return;
    return respond(res, "/v4/sports");
  });
  app.get("/api/dream-invest/betting/tournaments", async (req, res) => {
    if (!await requireOwner(req, res)) return;
    const sportId = text(req.query && req.query.sportId, 60);
    if (!sportId) return res.status(400).json({ success: false, error: "Enter a sport ID from OddsPapi sports." });
    return respond(res, "/v4/tournaments", { sportId });
  });
  app.get("/api/dream-invest/betting/odds", async (req, res) => {
    if (!await requireOwner(req, res)) return;
    const tournamentIds = text(req.query && req.query.tournamentIds, 500);
    const bookmaker = text(req.query && req.query.bookmaker, 80) || "betika";
    if (!tournamentIds || !/^[A-Za-z0-9,_-]+$/.test(tournamentIds)) return res.status(400).json({ success: false, error: "Enter valid tournament IDs separated by commas." });
    if (!/^[A-Za-z0-9 _.-]+$/.test(bookmaker)) return res.status(400).json({ success: false, error: "Enter a valid bookmaker name." });
    try {
      const data = await requestProvider("/v4/odds-by-tournaments", { bookmaker, tournamentIds });
      return res.json({ success: true, bookmaker, data, predictions: buildOddsPrediction(data), bet_placement_enabled: false });
    } catch (error) {
      const status = error && error.name === "AbortError" ? 504 : Number(error && error.status) || 502;
      return res.status(status).json({ success: false, error: error && error.name === "AbortError" ? "OddsPapi request timed out. Try again." : text(error && error.message, 240) || "OddsPapi request failed." });
    }
  });
}
module.exports = { registerOddsPapiRoutes, buildOddsPrediction, rowsOf, isOwner };
