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
function providerMessage(value) {
  if (typeof value === "string") return text(value, 180);
  if (value == null) return "";
  if (typeof value !== "object") return text(value, 180);
  for (const key of ["message", "error_description", "description", "detail", "error", "details", "reason"]) {
    const item = value[key];
    if (typeof item === "string" && item.trim()) return text(item, 180);
    if (item && typeof item === "object") {
      const nested = providerMessage(item);
      if (nested) return nested;
    }
  }
  try { return text(JSON.stringify(value), 180); } catch (_) { return ""; }
}
function numericOdds(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 && n < 10000 ? n : null;
}
function outcomeLabel(raw, fixture) {
  const value = text(raw, 100).toLowerCase().replace(/[_-]+/g, " ").trim();
  if (/^(1|home|home win|team 1|participant 1)$/.test(value)) return "home";
  if (/^(x|draw|tie)$/.test(value)) return "draw";
  if (/^(2|away|away win|team 2|participant 2)$/.test(value)) return "away";
  const home = text(fixture.participant1Name || fixture.homeTeam || fixture.home || fixture.home_team, 100).toLowerCase();
  const away = text(fixture.participant2Name || fixture.awayTeam || fixture.away || fixture.away_team, 100).toLowerCase();
  if (home && value === home) return "home";
  if (away && value === away) return "away";
  return null;
}
function structuredMarket(fixture, options = {}) {
  const preferredBookmaker = options.bookmaker;
  const bookmakerOdds = fixture && fixture.bookmakerOdds;
  if (!bookmakerOdds || typeof bookmakerOdds !== "object") return null;
  const entries = Object.entries(bookmakerOdds).filter(([name, book]) =>
    (!preferredBookmaker || name.toLowerCase() === preferredBookmaker.toLowerCase()) &&
    book && book.bookmakerIsActive !== false && book.suspended !== true &&
    book.markets && typeof book.markets === "object");
  for (const [bookmaker, book] of entries) {
    const markets = Object.entries(book.markets).filter(([, market]) =>
      market && market.marketActive !== false && market.suspended !== true && market.outcomes);
    const parsed = [];
    for (const [marketId, market] of markets) {
      if (options.requireThreeWay && String(marketId) !== "101") continue; // OddsPapi soccer market 101 is Full Time Result (1X2).
      const outcomes = [];
      for (const [outcomeId, outcome] of Object.entries(market.outcomes)) {
        const players = outcome && outcome.players;
        if (!players || typeof players !== "object") continue;
        for (const player of Object.values(players)) {
          if (!player || player.active === false) continue;
          const price = numericOdds(player.price);
          if (price === null) continue;
          const rawLabel = player.bookmakerOutcomeId || player.name || outcome.name || outcome.label || outcomeId;
          const label = outcomeLabel(rawLabel, fixture);
          if (!label || outcomes.some(item => item.outcome === label)) continue;
          outcomes.push({ outcome: label, decimal_odds: price, changed_at: text(player.changedAt || player.bookmakerChangedAt, 80) || null });
        }
      }
      const labels = new Set(outcomes.map(item => item.outcome));
      if (labels.has("home") && labels.has("away")) {
        const hasDraw = labels.has("draw");
        // A football 1X2 market must contain all three outcomes. Never mistake a two-way
        // market (e.g. draw-no-bet or winner) for a full-time result market.
        if (hasDraw) parsed.push({ bookmaker, market_id: marketId, market, outcomes, threeWay: true });
        else parsed.push({ bookmaker, market_id: marketId, market, outcomes, threeWay: false });
      }
    }
    const best = parsed.find(item => item.threeWay) || (!options.requireThreeWay ? parsed.find(item => item.outcomes.length === 2) : null);
    if (best) return best;
  }
  return null;
}
function buildOddsPrediction(payload, options = {}) {
  const rows = rowsOf(payload);
  const predictions = [];
  for (const row of rows) {
    const fixtureName = text(row.name || row.fixtureName || row.eventName || row.match || row.title ||
      [row.participant1Name || row.homeTeam || row.home || row.home_team, row.participant2Name || row.awayTeam || row.away || row.away_team].filter(Boolean).join(" vs ") || "Fixture", 180);
    const structured = structuredMarket(row, options);
    let odds = [];
    let marketType = "unknown";
    let bookmaker = options.bookmaker || null;
    let marketId = null;
    if (structured) {
      odds = structured.outcomes.map(item => ({ ...item, outcome: item.outcome === "home" ? text(row.participant1Name || row.homeTeam || row.home || "Home", 80) :
        item.outcome === "away" ? text(row.participant2Name || row.awayTeam || row.away || "Away", 80) : "Draw",
        implied_probability_pct: Number((100 / item.decimal_odds).toFixed(2)) }));
      marketType = structured.threeWay ? "three_way_match_result" : "two_way_winner";
      bookmaker = structured.bookmaker;
      marketId = structured.market_id;
    } else {
      // Legacy provider payloads are displayed as odds only. Do not promote unclassified
      // prices to a reliable prediction because different markets can be mixed together.
      const seen = new Set();
      function walk(value, depth) {
        if (!value || typeof value !== "object" || depth > 5) return;
        if (Array.isArray(value)) {
          value.slice(0, 40).forEach(item => walk(item, depth + 1));
          return;
        }
        for (const [key, item] of Object.entries(value)) {
          const odd = numericOdds(item);
          if (odd !== null && /odd|price|decimal/i.test(key)) {
            const label = text(value.name || value.label || value.outcome || key, 80);
            const identity = label + "|" + odd;
            if (!seen.has(identity)) { seen.add(identity); odds.push({ outcome: label, decimal_odds: odd, implied_probability_pct: Number((100 / odd).toFixed(2)) }); }
          } else if (item && typeof item === "object") walk(item, depth + 1);
        }
      }
      if (!row.bookmakerOdds) walk(row, 0);
    }
    const impliedSum = odds.reduce((sum, item) => sum + 1 / item.decimal_odds, 0);
    const hasRecognizedMarket = Boolean(structured);
    const normalized = hasRecognizedMarket && impliedSum > 0
      ? odds.map(item => ({ ...item, model_probability_pct: Number(((1 / item.decimal_odds) / impliedSum * 100).toFixed(2)) }))
      : [];
    const favourite = normalized.slice().sort((a, b) => b.model_probability_pct - a.model_probability_pct)[0] || null;
    const outcomeUpdates = odds.map(item => item.changed_at).filter(Boolean)
      .map(value => ({ value, time: Date.parse(value) })).filter(item => Number.isFinite(item.time));
    // Validate against the oldest priced outcome, not the newest: one refreshed price must
    // not make a market look fresh while its other outcomes remain stale.
    const oldestOutcomeUpdate = outcomeUpdates.sort((a, b) => a.time - b.time)[0];
    const hasTimestampForEveryOutcome = odds.length > 0 && odds.every(item => Boolean(item.changed_at) && Number.isFinite(Date.parse(item.changed_at)));
    const updatedAt = oldestOutcomeUpdate ? oldestOutcomeUpdate.value : (text(row.updatedAt || row.updated_at, 80) || null);
    const updatedMs = updatedAt ? Date.parse(updatedAt) : NaN;
    const oddsAgeMinutes = Number.isFinite(updatedMs) ? Math.max(0, Math.round((Date.now() - updatedMs) / 60000)) : null;
    const kickoffMs = Date.parse(row.startTime || row.start_time || row.kickoff || row.date || "");
    const minutesToKickoff = Number.isFinite(kickoffMs) ? Math.round((kickoffMs - Date.now()) / 60000) : null;
    const maxOddsAgeMinutes = minutesToKickoff !== null && minutesToKickoff <= 360 ? 90 :
      minutesToKickoff !== null && minutesToKickoff <= 1440 ? 360 : 1440;
    const statusId = Number(row.statusId);
    const preMatch = !Number.isFinite(statusId) || statusId === 0 || statusId === 1;
    const fresh = hasTimestampForEveryOutcome && oddsAgeMinutes !== null && oddsAgeMinutes <= maxOddsAgeMinutes;
    const validPrediction = Boolean(favourite && preMatch && fresh && (marketType !== "three_way_match_result" || normalized.length === 3));
    predictions.push({
      fixture: fixtureName,
      fixture_id: text(row.fixtureId || row.id || row.fixture_id, 100) || null,
      kickoff: text(row.startTime || row.start_time || row.kickoff || row.date, 80) || null,
      league: text(row.tournamentName || row.tournamentSlug, 120) || null,
      bookmaker,
      market_id: marketId,
      market_type: marketType,
      available_outcomes: odds,
      market_favourite: validPrediction ? favourite : null,
      probability_method: hasRecognizedMarket ? "Bookmaker implied probabilities normalized to remove the market overround" : "Unclassified odds; no prediction issued",
      data_quality: {
        structured_market_verified: hasRecognizedMarket,
        odds_last_updated: updatedAt,
        odds_age_minutes: oddsAgeMinutes,
        odds_fresh_for_kickoff_window: fresh,
        max_accepted_odds_age_minutes: maxOddsAgeMinutes,
        minutes_to_kickoff: minutesToKickoff,
        pre_match_status: preMatch
      },
      prediction_status: validPrediction ? "prediction_available" : "insufficient_verified_data",
      warning: validPrediction
        ? "Probability is a market-derived estimate, not a guarantee or an independently validated team-performance model."
        : "No prediction issued: verified market structure, fresh odds, or a pre-match fixture status was missing."
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
        const providerDetail = providerMessage(body && (body.message || body.error || body.details || body));
        let message;
        if (response.status === 401 || response.status === 403) {
          message = "OddsPapi rejected the API key or its permissions (HTTP " + response.status + "). Check that the key is active and belongs to the expected account.";
        } else if (response.status === 429) {
          message = "OddsPapi rate/request limit reached (HTTP 429)." + (providerDetail ? " " + providerDetail : " Check your OddsPapi request quota in the account dashboard.");
        } else if (response.status === 400) {
          message = "OddsPapi rejected the request (HTTP 400)." + (providerDetail ? " " + providerDetail : "");
        } else {
          message = "OddsPapi request failed (HTTP " + response.status + ")." + (providerDetail ? " " + providerDetail : " Check provider status and API permissions.");
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
      const sportLabels = sports.map(item => ({
        item,
        label: text(item.sportName || item.name || item.slug || item.sportSlug, 100).toLowerCase()
      }));
      const sport = (sportQuery === "soccer" || sportQuery === "football"
        ? sportLabels.find(entry => /soccer/.test(entry.label)) || sportLabels.find(entry => /football/.test(entry.label))
        : sportLabels.find(entry => entry.label === sportQuery) || sportLabels.find(entry => entry.label.includes(sportQuery)))?.item;
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
      const selectedIds = new Set(ids.map(String));
      const getScopedFixtures = payload => rowsOf(payload).filter(row => {
        const time = Date.parse(row.startTime || row.start_time || row.kickoff || row.date || "");
        return Number.isFinite(time) && time >= start && time <= end &&
          (!row.tournamentId || selectedIds.has(String(row.tournamentId)));
      });
      let bookmaker = "betika";
      let scoped = [];
      let predictions = [];
      let betikaError = null;
      try {
        const payload = await requestProvider("/v4/odds-by-tournaments", { bookmakers: bookmaker, tournamentIds: ids.join(",") });
        scoped = getScopedFixtures(payload);
        predictions = buildOddsPrediction(scoped, { bookmaker, requireThreeWay: /soccer|football/i.test(sportQuery) });
      } catch (error) {
        // A bookmaker-specific 400 can mean the provider does not expose that bookmaker
        // for this account/sport. Try the documented fallback, but never mask auth/quota errors.
        if (Number(error && error.status) !== 400) throw error;
        betikaError = text(error.message, 240);
      }
      if (betikaError || !predictions.some(item => item.available_outcomes.length)) {
        bookmaker = "pinnacle";
        try {
          const payload = await requestProvider("/v4/odds-by-tournaments", { bookmakers: bookmaker, tournamentIds: ids.join(",") });
          scoped = getScopedFixtures(payload);
          predictions = buildOddsPrediction(scoped, { bookmaker, requireThreeWay: /soccer|football/i.test(sportQuery) });
        } catch (error) {
          if (betikaError && Number(error && error.status) === 400) {
            error.message = "OddsPapi rejected both bookmaker requests. Betika: " + betikaError + " Pinnacle: " + text(error.message, 180);
          }
          throw error;
        }
      }
      predictions = predictions.map((item, index) => ({
        ...item,
        league: text(scoped[index] && (scoped[index].tournamentName || scoped[index].tournamentSlug) ||
          selected.find(entry => String(entry.id) === String(scoped[index] && scoped[index].tournamentId))?.name, 120) || "Competition",
        bookmaker: bookmaker === "betika" ? "Betika" : "Pinnacle"
      }));
      return res.json({ success: true, period, from: fromDate, to: toDate,
        sport: text(sport.sportName || sport.name || sportQuery, 80),
        league: leagueQuery === "all" ? "All leagues" : text(selected[0].name, 120),
        bookmaker: bookmaker === "betika" ? "Betika" : "Pinnacle", count: predictions.length, predictions,
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
      const data = await requestProvider("/v4/odds-by-tournaments", { bookmakers: bookmaker, tournamentIds });
      return res.json({ success: true, bookmaker, data, predictions: buildOddsPrediction(data, { bookmaker }), bet_placement_enabled: false });
    } catch (error) {
      const status = error && error.name === "AbortError" ? 504 : Number(error && error.status) || 502;
      return res.status(status).json({ success: false, error: error && error.name === "AbortError" ? "OddsPapi request timed out. Try again." : text(error && error.message, 240) || "OddsPapi request failed." });
    }
  });
}
module.exports = { registerOddsPapiRoutes, buildOddsPrediction, rowsOf, isOwner };
