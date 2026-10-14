"use strict";
const assert = require("node:assert/strict");
const { enrichWithAnalystConsensus } = require("../product/free_football_analysis_consensus");

async function main() {
  const oldFetch = global.fetch;
  const oldToken = process.env.BSD_API_TOKEN;
  process.env.BSD_API_TOKEN = "test-token";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      results: [{
        home_team: "Arsenal",
        away_team: "Chelsea",
        prediction: "Arsenal to win",
        market: "1X2",
        confidence: 0.84,
        probabilities: { home: 0.6, draw: 0.22, away: 0.18 }
      }]
    })
  });
  try {
    const input = [{
      fixture: "Arsenal vs Chelsea",
      home_team: "Arsenal",
      away_team: "Chelsea",
      model_probabilities: { home_win_pct: 55, draw_pct: 25, away_win_pct: 20 },
      market_favourite: { outcome: "Arsenal win", model_probability_pct: 55 }
    }];
    const result = await enrichWithAnalystConsensus(input, "2026-10-14", "2026-10-15");
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].external_analysis.source, "BSD free prediction model");
    assert.equal(result.events[0].analyst_consensus.label, "Models agree");
    assert.equal(result.events[0].analyst_consensus.agreement_pct, 100);
    assert.equal(result.events[0].model_probabilities.home_win_pct, 57.5);
    console.log("PASS free football analyst attaches source picks and combines probabilities");
  } finally {
    global.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.BSD_API_TOKEN;
    else process.env.BSD_API_TOKEN = oldToken;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
