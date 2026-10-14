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
    const value = row && row[key];
    if (value !== undefined && value !== null && value !== "") {
      const number = Number(value);
      if (Number.isFinite(number) && number >= 0) return number;
    }
  }
  return null;
}
function normalizeSportScore(row) {
  const home = clean(row.home || row.homeTeam || row.home_team || row.home_team_name || row.homeTeamName || row.team1 || row.participant1);
  const away = clean(row.away || row.awayTeam || row.away_team || row.away_team_name || row.awayTeamName || row.team2 || row.participant2);
  if (!home || !away) return null;
  const kickoff = clean(row.time || row.startTime || row.start_time || row.kickoff || row.utcDate || row.date || row.dateTime, 80);
  const status = clean(row.status || row.status_text || row.statusText || row.match_status, 60) || "unknown";
  const homeScore = scoreValue(row, ["home_score", "homeScore", "score_home", "homeGoals", "home_goals"]);
  const awayScore = scoreValue(row, ["away_score", "awayScore", "score_away", "awayGoals", "away_goals"]);
  return {
    fixture: home + " vs " + away, fixture_id: clean(row.id || row.fixture_id || row.match_id || row.slug, 100) || null,
    kickoff: kickoff || null, league: clean(row.competition || row.league || row.tournament || row.competition_name, 120) || "Competition",
    home_team: home, away_team: away, home_score: homeScore, away_score: awayScore,
    match_status: status, source: "SportScore", source_url: "https://sportscore.com/",
    result_verified: homeScore !== null && awayScore !== null,
    available_outcomes: [], market_favourite: null, prediction_status: "awaiting_form_data",
    warning: "Prediction uses recent published match results, not bookmaker odds. Estimates are uncertain and not guaranteed."
  };
}
function normalizeSportsDb(row) {
  const home = clean(row.strHomeTeam || row.homeTeam || row.home);
  const away = clean(row.strAwayTeam || row.awayTeam || row.away);
  if (!home || !away) return null;
  const date = clean(row.dateEvent || row.date || "", 20);
  const time = clean(row.strTime || row.time || "", 20);
  const kickoff = date ? (time && time !== "00:00:00" ? date + "T" + time + "Z" : date) : "";
  const homeScore = scoreValue(row, ["intHomeScore", "home_score", "homeScore"]);
  const awayScore = scoreValue(row, ["intAwayScore", "away_score", "awayScore"]);
  return {
    fixture: home + " vs " + away, fixture_id: clean(row.idEvent || row.id, 100) || null,
    kickoff: kickoff || null, league: clean(row.strLeague || row.league, 120) || "Competition",
    home_team: home, away_team: away, home_score: homeScore, away_score: awayScore,
    match_status: homeScore !== null && awayScore !== null ? "finished" : "scheduled",
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
  return /finished|final|completed|ended|full time|full-time|\\bft\\b|result_available/i.test(clean(event && event.match_status, 80));
}
function buildRecentForm(history, sport) {
  const teams = new Map();
  const cutoff = Date.now() - 45 * 86400000;
  for (const event of history) {
    if (event.home_score === null || event.away_score === null || !event.home_team || !event.away_team || !isFinalResult(event)) continue;
    const kickoffMs = Date.parse(event.kickoff || "");
    if (!Number.isFinite(kickoffMs) || kickoffMs > Date.now() || kickoffMs < cutoff) continue;
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
  if (!home || !away || home.games.length < 3 || away.games.length < 3) {
    return {
      ...event, prediction_status: "insufficient_verified_history", market_favourite: null,
      model_probabilities: null, confidence: "insufficient data",
      warning: "Not enough recent scored matches for both teams. Dream will not invent a prediction."
    };
  }
  const h = home.games.slice(0, 8), a = away.games.slice(0, 8);
  let probs;
  if (/^(soccer|football)$/i.test(sport)) {
    const homeScored = h.filter(g => g.isHome);
    const homeConceded = h.filter(g => g.isHome);
    const awayScored = a.filter(g => !g.isHome);
    const awayConceded = a.filter(g => !g.isHome);
    const avg = (games, key, fallback) => games.length ? games.reduce((sum, g) => sum + g[key], 0) / games.length : fallback;
    const leagueGoals = [...h, ...a].reduce((sum, g) => sum + g.scored, 0) / Math.max(1, h.length + a.length);
    const homeExpected = Math.max(0.15, Math.min(4.5, 0.55 * avg(homeScored, "scored", leagueGoals) + 0.45 * avg(awayConceded, "conceded", leagueGoals) + 0.18));
    const awayExpected = Math.max(0.15, Math.min(4.5, 0.55 * avg(awayScored, "scored", leagueGoals) + 0.45 * avg(homeConceded, "conceded", leagueGoals)));
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
  const sample = Math.min(home.games.length, away.games.length);
  const confidence = sample >= 7 && best.probability >= 0.55 ? "moderate" : "low";
  const label = best.key === "home" ? event.home_team + " win" : best.key === "away" ? event.away_team + " win" : "Draw";
  return {
    ...event, prediction_status: "model_estimate", model_probabilities: {
      home_win_pct: Math.round(probs.home * 1000) / 10,
      draw_pct: Math.round((probs.draw || 0) * 1000) / 10,
      away_win_pct: Math.round(probs.away * 1000) / 10
    },
    market_favourite: { outcome: label, model_probability_pct: Math.round(best.probability * 1000) / 10 },
    confidence, historical_matches_used: { home: h.length, away: a.length },
    warning: "Results-based statistical estimate from recent scored matches; no odds are used. Confidence is " + confidence + ", and this is not a guarantee."
  };
}
async function getPublicSportsEvents({ sport, fromDate, toDate }) {
  const apiSport = sportScoreSport(sport);
  if (!apiSport || !fromDate || !toDate) {
    return { events: [], history: [], providers: [], attribution_html: '<a href="https://sportscore.com/" rel="dofollow">Powered by SportScore</a>' };
  }
  const targetDates = dateRange(fromDate, toDate, 35);
  // Keep a short history window for an independent form-based prediction model.
  const historyDates = Array.from({ length: 10 }, (_, index) => dateAdd(fromDate, -(index + 1)));
  const allDates = [...new Set([...targetDates, ...historyDates])];
  const sportScoreResults = await mapLimit(allDates, 12, async date => {
    const url = SPORT_SCORE_BASE + "?" + new URLSearchParams({ sport: apiSport, date, limit: "200" }).toString();
    const payload = await fetchCache(url);
    return listOf(payload, ["fixtures", "matches", "events", "results", "data"]).map(normalizeSportScore).filter(Boolean);
  });
  const events = [];
  const history = [];
  let sportScoreOk = false;
  sportScoreResults.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    sportScoreOk = true;
    const date = allDates[index];
    const rows = result.value;
    if (targetDates.includes(date)) events.push(...rows.filter(event => inWindow(event, fromDate, toDate)));
    else history.push(...rows);
  });
  const dbSport = sportsDbSport(sport);
  let sportsDbOk = false;
  // Supplement the first, middle and final day to avoid overwhelming the free feed.
  const dbDates = [...new Set([fromDate, toDate, dateRange(fromDate, toDate, 35)[Math.floor((targetDates.length - 1) / 2)]].filter(Boolean))];
  const dbResults = await mapLimit(dbDates, 2, async date => {
    const url = SPORTS_DB_BASE + "?" + new URLSearchParams({ d: date, s: dbSport }).toString();
    const payload = await fetchCache(url);
    return listOf(payload, ["events", "results", "data"]).map(normalizeSportsDb).filter(Boolean);
  });
  dbResults.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    sportsDbOk = true;
    const date = dbDates[index];
    events.push(...result.value.filter(event => inWindow(event, fromDate, toDate)));
    if (date < fromDate) history.push(...result.value);
  });
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
  const uniqueEvents = dedupe(events).map(event => {
    if (event.result_verified && isFinalResult(event)) return { ...event, prediction_status: "result_available", market_favourite: null };
    return modelPrediction(event, teams, sport);
  }).sort((a, b) => Date.parse(a.kickoff || "") - Date.parse(b.kickoff || ""));
  const providers = [];
  if (sportScoreOk) providers.push("SportScore");
  if (sportsDbOk) providers.push("TheSportsDB");
  return {
    events: uniqueEvents, history_matches: uniqueHistory.length, providers,
    attribution_html: '<a href="https://sportscore.com/" rel="dofollow">Powered by SportScore</a>',
    model: "recent-results-form-v1"
  };
}
module.exports = { getPublicSportsEvents, normalizeSportScore, normalizeSportsDb, modelPrediction, buildRecentForm, isFinalResult };
