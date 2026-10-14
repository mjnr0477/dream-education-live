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
  assert.equal(sportScore.prediction_status, "insufficient_verified_data");
  assert.equal(sportScore.market_favourite, null);

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
      return { ok: true, status: 200, json: async () => ({
        sport: "football", matches: [
          { id: "ss-2", home: "Alpha FC", away: "Beta FC", time: "2026-10-14T15:00:00Z", status: "scheduled" }
        ]
      }) };
    }
    if (value.includes("thesportsdb.com")) {
      const date = new URL(value).searchParams.get("d");
      return { ok: true, status: 200, json: async () => ({
        events: date === "2026-10-14" ? [
          { idEvent: "tsdb-2", strHomeTeam: "Gamma", strAwayTeam: "Delta", dateEvent: date, strTime: "18:00:00" }
        ] : []
      }) };
    }
    throw new Error("Unexpected URL " + value);
  };
  try {
    const result = await getPublicSportsEvents({ sport: "soccer", fromDate: "2026-10-14", toDate: "2026-10-14" });
    assert.equal(result.events.length, 2);
    assert.deepEqual(result.providers.sort(), ["SportScore", "TheSportsDB"]);
    assert.match(result.attribution_html, /Powered by SportScore/);
    assert.ok(requests.some(url => url.includes("src=dream-education-live")));
  } finally {
    global.fetch = oldFetch;
  }
  console.log("Public sports event source smoke test passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
