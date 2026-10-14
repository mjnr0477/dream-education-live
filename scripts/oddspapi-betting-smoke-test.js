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
    return { ok: true, status: 200, json: async () => ({ fixtures: date === today ? [
      { id: "public-fx1", home: "Team A", away: "Team B", time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), status: "scheduled", competition: "Premier League" }
    ] : [] }) };
  }
  if (requested.includes("thesportsdb.com")) return { ok: true, status: 200, json: async () => ({ events: [] }) };
  const fixtures = [{ fixtureId: "fx1", tournamentId: 17, tournamentName: "Premier League", participant1Name: "Team A", participant2Name: "Team B", startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), odds: [{ name: "Team A", decimalOdds: 1.8 }, { name: "Draw", decimalOdds: 3.2 }, { name: "Team B", decimalOdds: 4.1 }] }];
  if (requested.includes("/v4/sports")) return { ok: true, status: 200, json: async () => [{ sportId: 10, sportName: "Soccer" }] };
  if (requested.includes("/v4/tournaments")) return { ok: true, status: 200, json: async () => [{ tournamentId: 17, tournamentName: "Premier League" }] };
  return { ok: true, status: 200, json: async () => fixtures };
}
registerOddsPapiRoutes(app, { getAuthenticatedAccount: async req => req.headers.authorization === "Bearer owner" ? { success: true, account: { owner_account: true } } : { success: false, status: 401, error: "Sign in first." } });
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
  assert.equal(response.body.predictions[0].prediction_status, "no_verified_consensus");
  assert.equal(response.body.predictions[0].market_prediction.probability_pct, null);
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "today", sport: "soccer", league: "all", market: "btts" } }, response);
  assert.equal(response.body.success, true);
  assert.equal(response.body.predictions[0].market_prediction.type, "btts");
  assert.equal(response.body.predictions[0].prediction_status, "no_verified_consensus");
  assert.equal(response.body.predictions[0].market_prediction.probability_pct, null);
  response = res();
  await routes.get["/api/dream-invest/betting/events"]({ headers: { authorization: "Bearer owner" }, query: { period: "today", sport: "soccer", market: "correct_score" } }, response);
  assert.match(response.body.predictions[0].market_prediction.label, /^\d+-\d+$/);
  assert.equal(oddsPapiRequests, oddsRequestsBeforePublicEvents, "Predictions must not depend on OddsPapi.");
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
