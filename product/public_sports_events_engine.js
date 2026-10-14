"use strict";

// Public event discovery and a conservative results-based model.
// OddsPapi is deliberately not required by this module.
const SPORT_SCORE_BASE = "https://sportscore.com/api/v1/fixtures/";
const SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/123/eventsday.php";
const publicCache = new Map();
const publicInflight = new Map();
const PUBLIC_CACHE_MS = 10 * 60 * 1000;
const MAX_CACHE = 500;

function clean(value, max = 160) {
  if (value && typeof value === "object") value = value.name || value.teamName || value.displayName || "";
  return String(value == null ? "" : value).trim().slice(0, max);
}
function listOf(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload && payload[key])) return payload[key];
  if (payload && payload.data && typeof payload.data === "object") return listOf(payload.data, keys);
  if (payload && payload.result && typeof payload.result === "object") return listOf(payload.result, keys);
  return [];
}
function fetchCache(url) {
  const cached = publicCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
  if (cached) publicCache.delete(url);
  if (publicInflight.has(url)) return publicInflight.get(url);
  const pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw Object.assign(new Error("Public sports source returned HTTP " + response.status), { status: response.status });
      const value = await response.json();
      publicCache.set(url, { value, expiresAt: Date.now() + PUBLIC_CACHE_MS });
      while (publicCache.size > MAX_CACHE) publicCache.delete(publicCache.keys().next().value);
      return value;
    } finally { clearTimeout(timer); }
  })();
  publicInflight.set(url, pending);
  return pending.finally(() => publicInflight.delete(url));
}
function sportScoreSport(sport) {
  const value = clean(sport, 50).toLowerCase();
  if (/^(soccer|football)$/.test(value)) return "football";
  if (/basketball/.test(value)) return "basketball";
  if (/cricket/.test(value)) return "cricket";
  if (/tennis/.test(value)) return "tennis";
  return null;
}
function sportsDbSport(sport) {
  const value = clean(sport, 50).toLowerCase();
  if (/^(soccer|football)$/.test(value)) return "Soccer";
  if (/basketball/.test(value)) return "Basketball";
  if (/cricket/.test(value)) return "Cricket";
  if (/tennis/.test(value)) return "Tennis";
  return null;
}
function scoreValue(row, keys) {
  for (const key of keys) {
    const value = row && row[key] !== undefined ? row[key] : row && row.score && row.score[key];
    if (value !== undefined && value !== null && value !== "") {
      const number = Number(value);
      if (Number.isFinite(number) && number >= 0) return number;
    }
  }
  return null;
}
function normalizeSportScore(row) {
  const home = clean(row.home || row.homeTeam || row.home_team || row.home_team_name || row.homeTeamName || row.homeTeam && row.homeTeam.name || row.team1 || row.participant1);
  const away = clean(row.away || row.awayTeam || row.away_team || row.away_team_name || row.awayTeamName || row.awayTeam && row.awayTeam.name || row.team2 || row.participant2);
  if (!home || !away) return null;
  const kickoff = clean(row.time || row.startTime || row.start_time || row.kickoff || row.utcDate || row.date || row.dateTime, 80);
  const status = clean(row.status || row.status_text || row.statusText || row.match_status, 60) || "unknown";
  const homeScore = scoreValue(row, ["home_score", "homeScore", "score_home", "homeGoals", "home_goals", "home"]);
  const awayScore = scoreValue(row, ["away_score", "awayScore", "score_away", "awayGoals", "away_goals", "away"]);
  return {
    fixture: home + " vs " + away, fixture_id: clean(row.id || row.fixture_id || row.match_id || row.slug, 100) || null,
    kickoff: kickoff || null, league: clean(row.competition || row.league || row.tournament || row.competition_name || row.competitionName || row.leagueName, 120) || "Competition",
    home_team: home, away_team: away, home_score: homeScore, away_score: awayScore,
    match_status: status, source: "SportScore", source_url: "https://sportscore.com/",
    result_verified: homeScore !== null && awayScore !== null,
    available_outcomes: [], market_favourite: null, prediction_status: "awaiting_form_data",
    warning: "Prediction uses recent published match results, not bookmaker odds. Estimates are uncertain and not guaranteed."
  };
}
const ESPN_LEAGUES = [
  ["eng.1", "Premier League"], ["eng.2", "English Championship"], ["eng.3", "English League One"],
  ["esp.1", "LaLiga"], ["esp.2", "LaLiga 2"], ["ger.1", "Bundesliga"], ["ger.2", "2. Bundesliga"],
  ["ita.1", "Serie A"], ["ita.2", "Serie B"], ["fra.1", "Ligue 1"], ["fra.2", "Ligue 2"],
  ["ned.1", "Eredivisie"], ["por.1", "Primeira Liga"], ["sco.1", "Scottish Premiership"],
  ["uefa.champions", "UEFA Champions League"], ["uefa.europa", "UEFA Europa League"],
  ["uefa.europa.conf", "UEFA Conference League"], ["usa.1", "MLS"], ["usa.usl.1", "USL Championship"], ["usa.nwsl", "NWSL"],
  ["mex.1", "Liga MX"], ["bra.1", "Brazil Serie A"], ["arg.1", "Argentina Primera División"],
  ["saudi.1", "Saudi Pro League"], ["aus.1", "A-League"], ["jpn.1", "J.League"], ["kor.1", "K League 1"]
];
function normalizeESPN(row, leagueName) {
  const competition = Array.isArray(row.competitions) ? row.competitions[0] : null;
  const competitors = competition && Array.isArray(competition.competitors) ? competition.competitors : [];
  const homeRow = competitors.find(item => item.homeAway === "home") || competitors[0];
  const awayRow = competitors.find(item => item.homeAway === "away") || competitors[1];
  const home = clean(homeRow && homeRow.team && (homeRow.team.displayName || homeRow.team.name));
  const away = clean(awayRow && awayRow.team && (awayRow.team.displayName || awayRow.team.name));
  if (!home || !away) return null;
  const status = clean(row.status && row.status.type && (row.status.type.name || row.status.type.state), 60) || "unknown";
  const homeScore = scoreValue({ value: homeRow && homeRow.score }, ["value"]);
  const awayScore = scoreValue({ value: awayRow && awayRow.score }, ["value"]);
  return {
    fixture: home + " vs " + away, fixture_id: clean(row.id, 100) || null,
    kickoff: clean(row.date, 80) || null, league: clean(competition && competition.name, 120) || leagueName,
    home_team: home, away_team: away, home_score: homeScore, away_score: awayScore,
    match_status: status, source: "ESPN", source_url: "https://www.espn.com/soccer/",
    result_verified: homeScore !== null && awayScore !== null,
    available_outcomes: [], market_favourite: null, prediction_status: "awaiting_form_data",
    warning: "Results-based statistical estimate from public match data."
  };
}
function espnDateRange(fromDate, toDate) {
  return fromDate.replace(/-/g, "") + "-" + toDate.replace(/-/g, "");
}
function normalizeSportsDb(row) {
  const home = clean(row.strHomeTeam || row.homeTeam || row.home);
  const away = clean(row.strAwayTeam || row.awayTeam || row.away);
  if (!home || !away) return null;
  const date = clean(row.dateEvent || row.date || "", 20);
  const time = clean(row.strTime || row.time || "", 20);
  const timestamp = row.strTimestamp ? Date.parse(row.strTimestamp) : NaN;
  const kickoff = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() :
    (date ? (time && time !== "00:00:00" ? date + "T" + time + "Z" : date) : "");
  const homeScore = scoreValue(row, ["intHomeScore", "home_score", "homeScore"]);
  const awayScore = scoreValue(row, ["intAwayScore", "away_score", "awayScore"]);
  const sourceStatus = clean(row.strProgress || row.strStatus || row.strEventStatus || row.status || "", 60);
  const matchStatus = sourceStatus || (homeScore !== null && awayScore !== null ? "unknown" : "scheduled");
  return {
    fixture: home + " vs " + away, fixture_id: clean(row.idEvent || row.id, 100) || null,
    kickoff: kickoff || null, league: clean(row.strLeague || row.league, 120) || "Competition",
    home_team: home, away_team: away, home_score: homeScore, away_score: awayScore,
    match_status: matchStatus,
    source: "TheSportsDB", source_url: "https://www.thesportsdb.com/",
    result_verified: homeScore !== null && awayScore !== null,
    available_outcomes: [], market_favourite: null, prediction_status: "awaiting_form_data",
    warning: "Prediction uses recent published match results. Estimates are uncertain and not guaranteed."
  };
}
function inWindow(event, fromDate, toDate) {
  if (!event.kickoff) return false;
  const time = Date.parse(event.kickoff);
  const start = Date.parse(fromDate + "T00:00:00+03:00");
  const end = Date.parse(toDate + "T23:59:59+03:00");
  return Number.isFinite(time) && time >= start && time <= end;
}
function dateAdd(date, days) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function dateRange(fromDate, toDate, maxDays = 35) {
  const start = Date.parse(fromDate + "T12:00:00Z");
  const end = Date.parse(toDate + "T12:00:00Z");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const count = Math.min(Math.floor((end - start) / 86400000) + 1, maxDays);
  return Array.from({ length: count }, (_, index) => dateAdd(fromDate, index));
}
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = { status: "fulfilled", value: await worker(items[index]) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  }));
  return results;
}
function teamKey(value) { return clean(value, 100).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function poisson(lambda, goals) {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= goals; i++) p *= lambda / i;
  return p;
}
function soccerProbabilities(homeLambda, awayLambda) {
  let home = 0, draw = 0, away = 0;
  for (let h = 0; h <= 8; h++) for (let a = 0; a <= 8; a++) {
    const p = poisson(homeLambda, h) * poisson(awayLambda, a);
    if (h > a) home += p; else if (h === a) draw += p; else away += p;
  }
  const total = home + draw + away || 1;
  return { home: home / total, draw: draw / total, away: away / total };
}
function isFinalResult(event) {
  return /finished|final|completed|ended|full time|full-time|\bft\b|result_available/i.test(clean(event && event.match_status, 80));
}
function isLiveEvent(event) {
  const status = clean(event && event.match_status, 80).toLowerCase();
  return /live|in[_ -]?play|in[_ -]?progress|\b1h\b|\b2h\b|\bht\b|\b1st half\b|\b2nd half\b|first half|second half|match started|playing|half.?time|extra time|penalt|overtime|quarter|period|\bset\s*\d|top of|bottom of/.test(status);
}
function isUpcomingOrLive(event, now = Date.now()) {
  // Keep a scheduled fixture visible at kickoff, including while a provider's
  // status is catching up. Remove it only when a source explicitly marks it
  // live/in-play or final, or verified scores are present.
  if (!event || !event.kickoff || !Number.isFinite(Date.parse(event.kickoff))) return false;
  if (isFinalResult(event) || isLiveEvent(event) || event.result_verified) return false;
  return true;
}
function buildRecentForm(history, sport) {
  const teams = new Map();
  const cutoff = Date.now() - 45 * 86400000;
  for (const event of history) {
    if (event.home_score === null || event.away_score === null || !event.home_team || !event.away_team) continue;
    const kickoffMs = Date.parse(event.kickoff || "");
    if (!Number.isFinite(kickoffMs) || kickoffMs > Date.now() || kickoffMs < cutoff) continue;
    // Historical source queries can contain valid final scores without a normalized
    // "finished" status. Accept scored, past, non-live rows as historical evidence.
    if (!isFinalResult(event) && !(event.result_verified && !isLiveEvent(event))) continue;
    const add = (team, opponent, scored, conceded, isHome) => {
      const key = teamKey(team);
      if (!key) return;
      if (!teams.has(key)) teams.set(key, { name: team, games: [] });
      teams.get(key).games.push({ kickoffMs, scored, conceded, isHome, opponent });
    };
    add(event.home_team, event.away_team, event.home_score, event.away_score, true);
    add(event.away_team, event.home_team, event.away_score, event.home_score, false);
  }
  for (const value of teams.values()) value.games.sort((a, b) => b.kickoffMs - a.kickoffMs);
  return teams;
}
function modelPrediction(event, teams, sport) {
  const home = teams.get(teamKey(event.home_team));
  const away = teams.get(teamKey(event.away_team));
  const isSoccer = /^(soccer|football)$/i.test(sport);
  if (!isSoccer && (!home || !away || home.games.length < 3 || away.games.length < 3)) {
    return {
      ...event, prediction_status: "insufficient_verified_history", market_favourite: null,
      model_probabilities: null, confidence: "insufficient data",
      warning: "Not enough recent scored matches for both teams. Dream will not invent a prediction."
    };
  }
  // Never manufacture a pick from a generic baseline. Soccer predictions require
  // enough verified recent matches for both teams and home/away-specific evidence.
  const homeGames = home && Array.isArray(home.games) ? home.games : [];
  const awayGames = away && Array.isArray(away.games) ? away.games : [];
  const h = homeGames.slice(0, 8), a = awayGames.slice(0, 8);
  const homeVenueGames = h.filter(game => game.isHome);
  const awayVenueGames = a.filter(game => !game.isHome);
  const hasEnoughHistory = h.length >= 5 && a.length >= 5 &&
    (!isSoccer || (homeVenueGames.length >= 2 && awayVenueGames.length >= 2));
  if (!hasEnoughHistory) {
    return {
      ...event,
      prediction_status: "insufficient_verified_history",
      prediction_quality: "insufficient_data",
      market_favourite: null,
      model_probabilities: null,
      model_markets: null,
      confidence: "insufficient data",
      historical_matches_used: { home: h.length, away: a.length },
      warning: "No prediction issued: Dream requires at least five recent verified results for each team and home/away evidence before generating a pick."
    };
  }
  let probs;
  let expectedGoals = null;
  if (/^(soccer|football)$/i.test(sport)) {
    const homeScored = h.filter(g => g.isHome);
    const homeConceded = h.filter(g => g.isHome);
    const awayScored = a.filter(g => !g.isHome);
    const awayConceded = a.filter(g => !g.isHome);
    const avg = (games, key, fallback) => games.length ? games.reduce((sum, g) => sum + g[key], 0) / games.length : fallback;
    const leagueGoals = ([...h, ...a].reduce((sum, g) => sum + g.scored, 0) / Math.max(1, h.length + a.length)) || 1.25;
    const homeExpected = Math.max(0.15, Math.min(4.5, 0.55 * avg(homeScored, "scored", leagueGoals) + 0.45 * avg(awayConceded, "conceded", leagueGoals) + 0.18));
    const awayExpected = Math.max(0.15, Math.min(4.5, 0.55 * avg(awayScored, "scored", leagueGoals) + 0.45 * avg(homeConceded, "conceded", leagueGoals)));
    expectedGoals = { home: homeExpected, away: awayExpected };
    probs = soccerProbabilities(homeExpected, awayExpected);
  } else {
    const rate = games => games.reduce((sum, g) => sum + (g.scored > g.conceded ? 1 : g.scored === g.conceded ? 0.5 : 0), 0) / games.length;
    const hp = Math.max(0.02, Math.min(0.96, rate(h) + 0.04));
    const ap = Math.max(0.02, Math.min(0.96, rate(a)));
    const homeP = hp / (hp + ap);
    probs = { home: homeP, away: 1 - homeP, draw: 0 };
  }
  const outcomes = Object.entries(probs).filter(([key, value]) => key !== "draw" || /^(soccer|football)$/i.test(sport))
    .map(([key, value]) => ({ key, probability: value }));
  outcomes.sort((x, y) => y.probability - x.probability);
  const best = outcomes[0];
  const sample = Math.min(homeGames.length, awayGames.length);
  const confidence = hasEnoughHistory && sample >= 7 && best.probability >= 0.55 ? "moderate" : "low";
  const historyQuality = "recent_team_form";
  const historyNote = "";
  const label = best.key === "home" ? event.home_team + " win" : best.key === "away" ? event.away_team + " win" : "Draw";
  let model_markets = null;
  if (expectedGoals) {
    const scores = [];
    let totalMass = 0;
    for (let hg = 0; hg <= 8; hg++) for (let ag = 0; ag <= 8; ag++) {
      const probability = poisson(expectedGoals.home, hg) * poisson(expectedGoals.away, ag);
      scores.push({ home: hg, away: ag, probability });
      totalMass += probability;
    }
    const pct = value => Math.round((value / (totalMass || 1)) * 1000) / 10;
    const btts = scores.filter(row => row.home > 0 && row.away > 0).reduce((sum, row) => sum + row.probability, 0);
    const totals = {};
    for (const line of [1.5, 2.5, 3.5]) {
      const over = scores.filter(row => row.home + row.away > line).reduce((sum, row) => sum + row.probability, 0);
      totals[String(line)] = { over_pct: pct(over), under_pct: pct(totalMass - over) };
    }
    const correct = scores.slice().sort((x, y) => y.probability - x.probability)[0];
    model_markets = {
      btts: { yes_pct: pct(btts), no_pct: pct(totalMass - btts) },
      totals,
      correct_score: { score: correct.home + "-" + correct.away, probability_pct: pct(correct.probability) }
    };
  }
  return {
    ...event, prediction_status: "model_estimate",
    prediction_quality: historyQuality, model_markets, model_probabilities: {
      home_win_pct: Math.round(probs.home * 1000) / 10,
      draw_pct: Math.round((probs.draw || 0) * 1000) / 10,
      away_win_pct: Math.round(probs.away * 1000) / 10
    },
    market_favourite: { outcome: label, model_probability_pct: Math.round(best.probability * 1000) / 10 },
    confidence, historical_matches_used: { home: h.length, away: a.length },
    warning: "Results-based statistical estimate; no odds are used. Confidence is " + confidence + "." + historyNote + " This is not a guarantee."
  };
}
async function getPublicSportsEvents({ sport, fromDate, toDate }) {
  const apiSport = sportScoreSport(sport);
  if (!apiSport || !fromDate || !toDate) {
    return { events: [], history_matches: 0, providers: [], source_errors: ["Unsupported sport or date range."], attribution_html: '<a href="https://sportscore.com/" rel="dofollow">Powered by SportScore</a>' };
  }
  const targetDates = dateRange(fromDate, toDate, 35);
  if (!targetDates.length) {
    return { events: [], history_matches: 0, providers: [], source_errors: ["Invalid date range."], attribution_html: '<a href="https://sportscore.com/" rel="dofollow">Powered by SportScore</a>' };
  }
  // Fetch sources concurrently. Sequentially waiting on every provider made the
  // old endpoint take too long, especially for a one-day request with 35 history days.
  const historyDates = Array.from({ length: 35 }, (_, index) => dateAdd(fromDate, -(index + 1)));
  const allDates = [...new Set([...targetDates, ...historyDates])];
  const sourceErrors = [];
  const loadSportScore = async () => {
    const results = await mapLimit(allDates, 20, async date => {
      const url = SPORT_SCORE_BASE + "?" + new URLSearchParams({ sport: apiSport, date, limit: "200" }).toString();
      const payload = await fetchCache(url);
      return { date, rows: listOf(payload, ["fixtures", "matches", "events", "results", "data"]).map(normalizeSportScore).filter(Boolean) };
    });
    const events = [], history = [];
    let ok = false;
    results.forEach(result => {
      if (result.status !== "fulfilled") return;
      ok = true;
      if (targetDates.includes(result.value.date)) events.push(...result.value.rows.filter(event => inWindow(event, fromDate, toDate)));
      else history.push(...result.value.rows);
    });
    if (!ok) sourceErrors.push("SportScore could not return fixture data.");
    return { events, history, ok };
  };
  const loadSportsDb = async () => {
    const dbSport = sportsDbSport(sport);
    const dbHistoryDates = historyDates.filter((_, index) => index % 3 === 0);
    const dbDates = [...new Set([...targetDates, ...dbHistoryDates])];
    const results = await mapLimit(dbDates, 15, async date => {
      const url = SPORTS_DB_BASE + "?" + new URLSearchParams({ d: date, s: dbSport }).toString();
      const payload = await fetchCache(url);
      return { date, rows: listOf(payload, ["events", "results", "data"]).map(normalizeSportsDb).filter(Boolean) };
    });
    const events = [], history = [];
    let ok = false;
    results.forEach(result => {
      if (result.status !== "fulfilled") return;
      ok = true;
      events.push(...result.value.rows.filter(event => inWindow(event, fromDate, toDate)));
      if (result.value.date < fromDate) history.push(...result.value.rows.filter(event => event.result_verified));
    });
    if (!ok) sourceErrors.push("TheSportsDB could not return fixture data.");
    return { events, history, ok };
  };
  const loadESPN = async () => {
    if (!/^(soccer|football)$/i.test(clean(sport, 50))) return { events: [], history: [], ok: false };
    const historyFrom = dateAdd(fromDate, -35);
    const historyTo = dateAdd(fromDate, -1);
    const results = await mapLimit(ESPN_LEAGUES, 12, async ([slug, leagueName]) => {
      const targetUrl = "https://site.api.espn.com/apis/site/v2/sports/soccer/" + slug +
        "/scoreboard?dates=" + espnDateRange(fromDate, toDate) + "&limit=100";
      const historyUrl = "https://site.api.espn.com/apis/site/v2/sports/soccer/" + slug +
        "/scoreboard?dates=" + espnDateRange(historyFrom, historyTo) + "&limit=100";
      const [targetPayload, historyPayload] = await Promise.all([fetchCache(targetUrl), fetchCache(historyUrl)]);
      return {
        events: listOf(targetPayload, ["events"]).map(row => normalizeESPN(row, leagueName)).filter(Boolean),
        history: listOf(historyPayload, ["events"]).map(row => normalizeESPN(row, leagueName)).filter(event => event && event.result_verified)
      };
    });
    const events = [], history = [];
    let ok = false;
    results.forEach(result => {
      if (result.status !== "fulfilled") return;
      ok = true;
      events.push(...result.value.events.filter(event => inWindow(event, fromDate, toDate)));
      history.push(...result.value.history);
    });
    if (!ok) sourceErrors.push("ESPN could not return fixture data.");
    return { events, history, ok };
  };
  const [sportScoreResult, sportsDbResult, espnResult] = await Promise.all([
    loadSportScore().catch(error => { sourceErrors.push("SportScore: " + clean(error.message, 120)); return { events: [], history: [], ok: false }; }),
    loadSportsDb().catch(error => { sourceErrors.push("TheSportsDB: " + clean(error.message, 120)); return { events: [], history: [], ok: false }; }),
    loadESPN().catch(error => { sourceErrors.push("ESPN: " + clean(error.message, 120)); return { events: [], history: [], ok: false }; })
  ]);
  const events = [...sportScoreResult.events, ...sportsDbResult.events, ...espnResult.events];
  const history = [...sportScoreResult.history, ...sportsDbResult.history, ...espnResult.history];
  const dedupe = rows => {
    const seen = new Set();
    return rows.filter(event => {
      const key = teamKey(event.home_team) + "|" + teamKey(event.away_team) + "|" + String(event.kickoff || "").slice(0, 10);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const uniqueHistory = dedupe(history);
  const teams = buildRecentForm(uniqueHistory, sport);
  // A fixture must have a future kickoff and a pre-match status. Results and live
  // events are historical evidence only; they never enter the upcoming list.
  const uniqueEvents = dedupe(events).filter(event => isUpcomingOrLive(event)).map(event => {
    const predicted = modelPrediction(event, teams, sport);
    return { ...predicted, event_state: "upcoming" };
  }).sort((a, b) => Date.parse(a.kickoff || "") - Date.parse(b.kickoff || ""));
  const providers = [];
  if (sportScoreResult.ok) providers.push("SportScore");
  if (sportsDbResult.ok) providers.push("TheSportsDB");
  if (espnResult.ok) providers.push("ESPN");
  return {
    events: uniqueEvents, history_matches: uniqueHistory.length, providers, source_errors: sourceErrors,
    source_status: providers.length ? "available" : "unavailable",
    attribution_html: '<a href="https://sportscore.com/" rel="dofollow">Powered by SportScore</a>',
    model: "recent-results-form-v1"
  };
}
module.exports = { getPublicSportsEvents, normalizeSportScore, normalizeSportsDb, normalizeESPN, modelPrediction, buildRecentForm, isFinalResult, isLiveEvent, isUpcomingOrLive };
