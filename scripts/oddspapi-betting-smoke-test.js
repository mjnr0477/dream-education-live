"use strict";
const assert = require("node:assert/strict");
const { registerOddsPapiRoutes, buildOddsPrediction } = require("../product/oddspapi_betting_engine");
const routes = { get: {} };
const app = { get(path, handler) { routes.get[path] = handler; } };
const oldKey = process.env.ODDSPAPI_API_KEY;
const oldFetch = global.fetch;
process.env.ODDSPAPI_API_KEY = "test-key";
let requested = "";
let oddsPapiRequests = 0;
let mockProviderResponse = null;
global.fetch = async url => {
  requested = String(url);
  if (requested.includes("api.oddspapi.io")) oddsPapiRequests++;
  if (mockProviderResponse) return mockProviderResponse;
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const today = ["year", "month", "day"].map(type => dateParts.find(part => part.type === type).value).join("-");
  if (requested.includes("sportscore.com")) {
    const date = new URL(requested).searchParams.get("date");
    const fixtures = date === today ? [
      { id: "public-fx1", home: "Team A", away: "Team B", time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), status: "scheduled", competition: "Premier League" }
    ] : [
      { id: "history-home-" + date, home: "Team A", away: "Other FC", time: new Date(date + "T12:00:00Z").toISOString(), status: "finished", home_score: 2, away_score: 0, competition: "Premier League" },
      { id: "history-away-" + date, home: "Other FC", away: "Team B", time: new Date(date + "T12:00:00Z").toISOString(), status: "finished", home_score: 0, away_score: 1, competition: "Premier League" }
    ];
    return { ok: true, status: 200, json: async () => ({ fixtures }) };
  }
  if (requested.includes("thesportsdb.com")) return { ok: true, status: 200, json: async () => ({ events: [] }) };
  const fixtures = [{ fixtureId: "fx1", tournamentId: 17, tournamentName: "Premier League", participant1Name: "Team A", participant2Name: "Team B", startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), odds: [{ name: "Team A", decimalOdds: 1.8 }, { name: "Draw", decimalOdds: 3.2 }, { name: "Team B", decimalOdds: 4.1 }] }];
  if (requested.includes("/v4/sports")) return { ok: true, status: 200, json: async () => [{ sportId: 10, sportName: "Soccer" }] };
  if (requested.includes("/v4/tournaments")) return { ok: true, status: 200, json: async () => [{ tournamentId: 17, tournamentName: "Premier League" }] };
  return { ok: true, status: 200, json: async () => fixtures };
}
registerOddsPapiRoutes(app, { getAuthenticatedAccount: async req => {
  if (req.headers.authorization === "Bearer owner") return { success: true, account: { owner_account: true } };
  if (req.headers.authorization === "Bearer user") return { success: true, account: { email: "learner@example.com", role: "learner" } };
  return { success: false, status: 401, error: "Sign in first." };
} });
function res() { return { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; }
(async () => {
  let response = res();
  await routes.get["/api/dream-invest/betting/status"]({ headers: { authorization: "Bearer owner" } }, response);
  assert.equal(response.body.configured, true);
  response = res();
  await routes.get["/api/dream-invest/betting/odds"]({ headers: { authorization: "Bearer owner" }, query: { tournamentIds: "17,8", bookmaker: "betika" } }, response);
  assert.equal(response.body.success, true);
  assert.ok(requested.includes("/v4/odds-by-tournaments"));
  assert.ok(requested.includes("apiKey=test-key"));
  response = res();
  await routes.get["/api/dream-invest/betting/odds"]({ headers: { authorization: "Bearer owner" }, query: {} }, response);
  assert.equal(response.statusCode, 400);
  const oddsRequestsBeforePublicEvents = oddsPapiRequests;
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer user" }, query: { period: "today", sport: "soccer", league: "all", optionsOnly: "1" } }, response);
  assert.equal(response.body.success, true, "Any authenticated Dream Education user can access public event discovery.");
  response = res();
  await routes.get["/api/dream-invest/betting/status"]({ headers: { authorization: "Bearer user" } }, response);
  assert.equal(response.statusCode, 403, "Provider configuration remains owner-only.");
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: {}, query: { period: "today", sport: "soccer" } }, response);
  assert.equal(response.statusCode, 401, "Betting events still require a signed-in account.");
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "today", sport: "soccer", league: "all", optionsOnly: "1" } }, response);
  assert.equal(response.body.success, true);
  assert.equal(response.body.leagues[0].name, "Premier League");
  assert.equal(oddsPapiRequests, oddsRequestsBeforePublicEvents, "Public event discovery must not call OddsPapi.");
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "today", sport: "soccer", league: "all" } }, response);
  assert.equal(response.body.success, true);
  assert.equal(response.body.count, 1);
  assert.equal(response.body.predictions[0].fixture, "Team A vs Team B");
  assert.equal(response.body.predictions[0].market_prediction.type, "h2h");
  assert.equal(response.body.predictions[0].prediction_status, "model_estimate");
  assert.ok(response.body.predictions[0].market_prediction.probability_pct > 0);
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "today", sport: "soccer", league: "all", market: "btts" } }, response);
  assert.equal(response.body.success, true);
  assert.equal(response.body.predictions[0].market_prediction.type, "btts");
  assert.equal(response.body.predictions[0].prediction_status, "model_estimate");
  assert.ok(response.body.predictions[0].market_prediction.probability_pct > 0,
    "A history-backed model estimate should be visible without an optional external consensus provider.");
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "today", sport: "soccer", market: "correct_score" } }, response);
  assert.equal(response.body.predictions[0].prediction_status, "model_estimate");
  assert.ok(response.body.predictions[0].market_prediction.probability_pct > 0);
  assert.equal(oddsPapiRequests, oddsRequestsBeforePublicEvents, "Predictions must not depend on OddsPapi.");
  const todayParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const todayInNairobi = ["year", "month", "day"].map(type => todayParts.find(part => part.type === type).value).join("-");
  const addDateDays = (date, days) => {
    const value = new Date(date + "T12:00:00Z");
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const expectedDateRanges = [
    ["today", {}, todayInNairobi, todayInNairobi],
    ["tomorrow", {}, addDateDays(todayInNairobi, 1), addDateDays(todayInNairobi, 1)],
    ["day_after_tomorrow", {}, addDateDays(todayInNairobi, 2), addDateDays(todayInNairobi, 2)],
    ["custom", { date: addDateDays(todayInNairobi, 5) }, addDateDays(todayInNairobi, 5), addDateDays(todayInNairobi, 5)],
    ["this_week", {}, todayInNairobi, addDateDays(todayInNairobi, 6 - ((new Date(todayInNairobi + "T12:00:00Z").getUTCDay() + 6) % 7))],
    ["next_week", {}, addDateDays(todayInNairobi, 7 - ((new Date(todayInNairobi + "T12:00:00Z").getUTCDay() + 6) % 7)), addDateDays(todayInNairobi, 13 - ((new Date(todayInNairobi + "T12:00:00Z").getUTCDay() + 6) % 7))]
  ];
  for (const [period, extra, from, to] of expectedDateRanges) {
    response = res();
    await routes.get["/api/dream-invest/betting/events"]({
      headers: { authorization: "Bearer owner" }, query: { period, sport: "soccer", ...extra }
    }, response);
    assert.equal(response.body.success, true, period + " should be supported.");
    assert.equal(response.body.from, from, period + " should use the correct start date.");
    assert.equal(response.body.to, to, period + " should use the correct end date.");
  }
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "this_month", sport: "soccer" } }, response);
  assert.equal(response.body.success, true);
  assert.equal(response.body.from, todayInNairobi);
  assert.equal(response.body.to, todayInNairobi.slice(0, 8) + String(new Date(Date.UTC(Number(todayInNairobi.slice(0, 4)), Number(todayInNairobi.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0"));
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "custom", date: addDateDays(todayInNairobi, -1), sport: "soccer" } }, response);
  assert.equal(response.statusCode, 400, "Past custom dates must be rejected.");
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "year", sport: "soccer" } }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(routes.get["/api/dream-invest/betting/sports"] instanceof Function, true);
  assert.equal(routes.get["/api/dream-invest/betting/tournaments"] instanceof Function, true);
  mockProviderResponse = { ok: false, status: 429, json: async () => ({ message: "Request limit exceeded", code: "REQUEST_LIMIT_EXCEEDED" }) };
  response = res();
  await routes.get["/api/dream-invest/betting/odds"]({ headers: { authorization: "Bearer owner" }, query: { tournamentIds: "429-test", bookmaker: "betika" } }, response);
  assert.equal(response.statusCode, 429);
  assert.match(response.body.error, /HTTP 429/);
  assert.match(response.body.error, /REQUEST_LIMIT_EXCEEDED/);
  assert.match(response.body.error, /Request limit exceeded/);
  assert.match(response.body.error, /60 seconds/);
  const lastRequestAfter429 = requested;
  response = res();
  await routes.get["/api/dream-invest/betting/odds"]({ headers: { authorization: "Bearer owner" }, query: { tournamentIds: "cooldown-test", bookmaker: "betika" } }, response);
  assert.equal(response.statusCode, 429);
  assert.match(response.body.error, /paused provider calls/);
  assert.equal(requested, lastRequestAfter429);
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "today", sport: "soccer", league: "all" } }, response);
  assert.equal(response.body.success, true);
  assert.ok(Array.isArray(response.body.predictions));
  assert.ok(response.body.message.includes("No OddsPapi request is made"));
  mockProviderResponse = null;
  assert.equal(buildOddsPrediction({ data: [{ name: "A vs B", odds: [{ name: "A", decimalOdds: 1.8 }] }] }).length, 1);
  const structuredFixture = {
    fixtureId: "structured-1", participant1Name: "Home FC", participant2Name: "Away FC",
    tournamentName: "Test League", statusId: 0, updatedAt: new Date().toISOString(),
    startTime: new Date(Date.now() + 3600000).toISOString(),
    bookmakerOdds: { pinnacle: { bookmakerIsActive: true, suspended: false, markets: {
      "101": { marketActive: true, outcomes: {
        "1": { players: { "0": { active: true, bookmakerOutcomeId: "home", price: 2.1, changedAt: new Date().toISOString() } } },
        "X": { players: { "0": { active: true, bookmakerOutcomeId: "draw", price: 3.3, changedAt: new Date().toISOString() } } },
        "2": { players: { "0": { active: true, bookmakerOutcomeId: "away", price: 3.6, changedAt: new Date().toISOString() } } }
      } }
    } } }
  };
  const calibrated = buildOddsPrediction([structuredFixture], { bookmaker: "pinnacle" })[0];
  assert.equal(calibrated.prediction_status, "prediction_available");
  assert.equal(calibrated.market_type, "three_way_match_result");
  assert.equal(calibrated.available_outcomes.length, 3);
  assert.ok(calibrated.market_favourite.model_probability_pct > 0);
  assert.ok(Math.abs(calibrated.available_outcomes.reduce((sum, item) => sum + item.model_probability_pct, 0) - 100) < 0.1);
  assert.equal(calibrated.data_quality.structured_market_verified, true);
  const incompleteSoccer = JSON.parse(JSON.stringify(structuredFixture));
  delete incompleteSoccer.bookmakerOdds.pinnacle.markets["101"].outcomes.X;
  assert.equal(buildOddsPrediction([incompleteSoccer], { bookmaker: "pinnacle", requireThreeWay: true })[0].prediction_status, "insufficient_verified_data");
  const staleFixture = JSON.parse(JSON.stringify(structuredFixture));
  staleFixture.updatedAt = new Date(Date.now() - 8 * 3600000).toISOString();
  for (const outcome of Object.values(staleFixture.bookmakerOdds.pinnacle.markets["101"].outcomes)) outcome.players["0"].changedAt = new Date(Date.now() - 8 * 3600000).toISOString();
  const stale = buildOddsPrediction([staleFixture], { bookmaker: "pinnacle" })[0];
  assert.equal(stale.prediction_status, "insufficient_verified_data");
  assert.equal(stale.market_favourite, null);
  const mixedFreshness = JSON.parse(JSON.stringify(structuredFixture));
  mixedFreshness.bookmakerOdds.pinnacle.markets["101"].outcomes["1"].players["0"].changedAt = new Date(Date.now() - 8 * 3600000).toISOString();
  assert.equal(buildOddsPrediction([mixedFreshness], { bookmaker: "pinnacle" })[0].prediction_status, "insufficient_verified_data");

  if (oldKey === undefined) delete process.env.ODDSPAPI_API_KEY; else process.env.ODDSPAPI_API_KEY = oldKey;
  global.fetch = oldFetch;
  console.log("OddsPapi betting engine smoke test passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
