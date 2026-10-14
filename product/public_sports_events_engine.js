"use strict";

// Free public fixture discovery. OddsPapi remains the odds source; these feeds
// expand event coverage but never fabricate prices or force a prediction.
const SPORT_SCORE_BASE = "https://sportscore.com/api/v1/matches/";
const SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/123/eventsday.php";
const publicCache = new Map();
const publicInflight = new Map();
const PUBLIC_CACHE_MS = 5 * 60 * 1000;

function clean(value, max = 160) {
  return String(value == null ? "" : value).trim().slice(0, max);
}
function listOf(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload && payload[key])) return payload[key];
  return [];
}
function cacheKey(url) { return url; }
async function fetchJson(url) {
  const key = cacheKey(url);
  const cached = publicCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) publicCache.delete(key);
  if (publicInflight.has(key)) return publicInflight.get(key);
  const pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw Object.assign(new Error("Public sports source returned HTTP " + response.status), { status: response.status });
      const value = await response.json();
      publicCache.set(key, { value, expiresAt: Date.now() + PUBLIC_CACHE_MS });
      if (publicCache.size > 100) publicCache.delete(publicCache.keys().next().value);
      return value;
    } finally {
      clearTimeout(timer);
    }
  })();
  publicInflight.set(key, pending);
  try { return await pending; }
  finally { publicInflight.delete(key); }
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
function normalizeSportScore(row) {
  const home = clean(row.home || row.homeTeam || row.home_team, 100);
  const away = clean(row.away || row.awayTeam || row.away_team, 100);
  if (!home || !away) return null;
  const kickoff = clean(row.time || row.startTime || row.kickoff || row.date, 80);
  const status = clean(row.status || row.status_text || row.statusText, 60);
  return {
    fixture: home + " vs " + away, fixture_id: clean(row.id || row.match_id || row.slug, 100) || null,
    kickoff: kickoff || null, league: clean(row.competition || row.league || row.tournament, 120) || "Competition",
    home_team: home, away_team: away, home_score: row.home_score ?? row.homeScore ?? null,
    away_score: row.away_score ?? row.awayScore ?? null, match_status: status || "unknown",
    source: "SportScore", source_url: clean(row.url || row.site_url, 300) || "https://sportscore.com/",
    available_outcomes: [], market_favourite: null, prediction_status: "insufficient_verified_data",
    warning: "Fixture data only. No fresh, verified odds or independent team-performance probability model is available for this event."
  };
}
function normalizeSportsDb(row) {
  const home = clean(row.strHomeTeam || row.homeTeam || row.home, 100);
  const away = clean(row.strAwayTeam || row.awayTeam || row.away, 100);
  if (!home || !away) return null;
  const date = clean(row.dateEvent || row.date || "", 20);
  const time = clean(row.strTime || row.time || "", 20);
  const kickoff = date ? (time && time !== "00:00:00" ? date + "T" + time + "Z" : date) : "";
  const homeScore = row.intHomeScore == null || row.intHomeScore === "" ? null : Number(row.intHomeScore);
  const awayScore = row.intAwayScore == null || row.intAwayScore === "" ? null : Number(row.intAwayScore);
  return {
    fixture: home + " vs " + away, fixture_id: clean(row.idEvent || row.id, 100) || null,
    kickoff: kickoff || null, league: clean(row.strLeague || row.league, 120) || "Competition",
    home_team: home, away_team: away, home_score: Number.isFinite(homeScore) ? homeScore : null,
    away_score: Number.isFinite(awayScore) ? awayScore : null,
    match_status: homeScore !== null && awayScore !== null ? "result_available" : "scheduled",
    source: "TheSportsDB", source_url: clean(row.strEvent || "", 200) ? "https://www.thesportsdb.com/" : "https://www.thesportsdb.com/",
    available_outcomes: [], market_favourite: null, prediction_status: "insufficient_verified_data",
    warning: "Fixture/result data only. A prediction will be shown only when OddsPapi supplies a matching fresh, verified market."
  };
}
function inWindow(event, fromDate, toDate) {
  if (!event.kickoff) return false;
  const time = Date.parse(event.kickoff);
  const start = Date.parse(fromDate + "T00:00:00+03:00");
  const end = Date.parse(toDate + "T23:59:59+03:00");
  return Number.isFinite(time) && time >= start && time <= end;
}
async function getPublicSportsEvents({ sport, fromDate, toDate }) {
  const results = await Promise.allSettled((() => {
    const tasks = [];
    const ssSport = sportScoreSport(sport);
    const dbSport = sportsDbSport(sport);
    if (ssSport) {
      const url = SPORT_SCORE_BASE + "?" + new URLSearchParams({ sport: ssSport, limit: "50", src: "dream-education-live" }).toString();
      tasks.push(fetchJson(url).then(payload => ({
        provider: "SportScore",
        events: listOf(payload, ["matches", "events", "results", "data"]).map(normalizeSportScore).filter(Boolean)
      })));
    }
    if (dbSport && fromDate && toDate) {
      // The free tier is deliberately queried at no more than three representative
      // dates per selection; cache avoids repeating these requests on every refresh.
      const startMs = Date.parse(fromDate + "T12:00:00Z");
      const endMs = Date.parse(toDate + "T12:00:00Z");
      const dateValues = [fromDate, toDate, new Date((startMs + endMs) / 2).toISOString().slice(0, 10)];
      for (const date of [...new Set(dateValues)].slice(0, 3)) {
        const url = SPORTS_DB_BASE + "?" + new URLSearchParams({ d: date, s: dbSport }).toString();
        tasks.push(fetchJson(url).then(payload => ({
          provider: "TheSportsDB",
          events: listOf(payload, ["events", "results", "data"]).map(normalizeSportsDb).filter(Boolean)
        })));
      }
    }
    return tasks;
  })());
  const events = [];
  const providers = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    providers.push(result.value.provider);
    events.push(...result.value.events.filter(event => inWindow(event, fromDate, toDate)));
  }
  const seen = new Set();
  const unique = events.filter(event => {
    const key = [event.home_team, event.away_team].map(value => value.toLowerCase().replace(/[^a-z0-9]/g, "")).join("|") +
      "|" + String(event.kickoff || "").slice(0, 10);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    events: unique,
    providers: [...new Set(providers)],
    attribution_html: '<a href="https://sportscore.com/" rel="dofollow">Powered by SportScore</a>'
  };
}
module.exports = { getPublicSportsEvents, normalizeSportScore, normalizeSportsDb };
