"use strict";
const assert = require("node:assert/strict");
const { enrichWithAnalystConsensus } = require("../product/free_football_analysis_consensus");

async function main() {
  const oldFetch = global.fetch;
  const oldToken = process.env.BSD_API_TOKEN;
  process.env.BSD_API_TOKEN = "test-token";
  let requestedUrl = "";
  let requestedAuthorization = "";
  global.fetch = async (url, options) => {
    requestedUrl = String(url);
    requestedAuthorization = options.headers.Authorization;
    return {
      ok: true,
      json: async () => ({
        results: [{
          event: { home_team: "Arsenal", away_team: "Chelsea" },
          markets: { match_result: { prob_home: 60, prob_draw: 22, prob_away: 18, predicted: "home" } },
          model: { confidence: 0.84 }
        }]
      })
    };
  };
  try {
    const input = [{
      fixture: "Arsenal vs Chelsea",
      home_team: "Arsenal",
      away_team: "Chelsea",
      model_probabilities: { home_win_pct: 55, draw_pct: 25, away_win_pct: 20 },
      market_favourite: { outcome: "Arsenal win", model_probability_pct: 55 },
      prediction_quality: "recent_team_form",
      confidence: "moderate"
    }];
    const result = await enrichWithAnalystConsensus(input, "2026-10-14", "2026-10-15");
    assert.equal(result.events.length, 1);
    assert.match(requestedUrl, /^https:\/\/sports\.bzzoiro\.com\/api\/v2\/predictions\//);
    assert.equal(requestedAuthorization, "Token test-token");
    assert.equal(result.events[0].external_analysis.source, "BSD free prediction model");
    assert.equal(result.events[0].external_analysis.pick, "Arsenal win");
    assert.equal(result.events[0].external_analysis.confidence_pct, 84);
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
