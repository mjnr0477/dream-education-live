"use strict";
const assert = require("node:assert/strict");
const { getPublicSportsEvents, normalizeSportScore, normalizeSportsDb } = require("../product/public_sports_events_engine");

(async () => {
  const sportScore = normalizeSportScore({
    id: "ss-1", home: "Alpha FC", away: "Beta FC",
    time: "2026-10-14T15:00:00Z", status: "scheduled"
  });
  assert.equal(sportScore.fixture, "Alpha FC vs Beta FC");
  assert.equal(sportScore.source, "SportScore");
  assert.equal(sportScore.result_verified, false);

  const sportsDb = normalizeSportsDb({
    idEvent: "tsdb-1", strHomeTeam: "Gamma", strAwayTeam: "Delta",
    dateEvent: "2026-10-14", strTime: "18:00:00", intHomeScore: null, intAwayScore: null
  });
  assert.equal(sportsDb.fixture, "Gamma vs Delta");
  assert.equal(sportsDb.source, "TheSportsDB");

  const oldFetch = global.fetch;
  const requests = [];
  global.fetch = async url => {
    const value = String(url);
    requests.push(value);
    if (value.includes("sportscore.com")) {
      const date = new URL(value).searchParams.get("date");
      if (date === "2026-10-14") {
        return { ok: true, status: 200, json: async () => ({
          fixtures: [{ id: "ss-target", home: "Alpha FC", away: "Beta FC",
            time: "2026-10-14T15:00:00Z", status: "scheduled", competition: "Test League" }]
        }) };
      }
      const earlier = new Date(date + "T12:00:00Z");
      const iso = earlier.toISOString();
      return { ok: true, status: 200, json: async () => ({
        fixtures: [
          { id: "h-" + date, home: "Alpha FC", away: "Other FC", time: iso, status: "finished", home_score: 2, away_score: 0 },
          { id: "a-" + date, home: "Other FC", away: "Beta FC", time: iso, status: "finished", home_score: 0, away_score: 1 }
        ]
      }) };
    }
    if (value.includes("thesportsdb.com")) {
      return { ok: true, status: 200, json: async () => ({ events: [] }) };
    }
    throw new Error("Unexpected URL " + value);
  };
  try {
    const result = await getPublicSportsEvents({ sport: "soccer", fromDate: "2026-10-14", toDate: "2026-10-14" });
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].fixture, "Alpha FC vs Beta FC");
    assert.equal(result.events[0].prediction_status, "model_estimate");
    assert.ok(result.events[0].model_probabilities);
    assert.ok(result.events[0].model_markets);
    assert.ok(Number.isFinite(result.events[0].model_markets.btts.yes_pct));
    assert.ok(Number.isFinite(result.events[0].model_markets.totals["2.5"].over_pct));
    assert.match(result.events[0].model_markets.correct_score.score, /^\d+-\d+$/);
    assert.equal(result.providers.includes("SportScore"), true);
    assert.match(result.attribution_html, /Powered by SportScore/);
    assert.ok(requests.some(url => url.includes("/api/v1/fixtures/") && url.includes("date=2026-10-14")));
    assert.ok(requests.some(url => url.includes("thesportsdb.com") && new URL(url).searchParams.get("d") < "2026-10-14"), "TheSportsDB should contribute historical results, not just upcoming fixtures.");
    assert.ok(requests.every(url => !url.includes("oddspapi.io")));
  } finally {
    global.fetch = oldFetch;
  }
  console.log("Public sports event source and results-model smoke test passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
