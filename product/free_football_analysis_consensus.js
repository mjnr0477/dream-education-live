"use strict";

// Optional free external football analyst. BSD requires a free account token;
// when it is absent or unavailable, Dream's own statistical estimate still shows.
const BASE = "https://sports.bzzoiro.com/api/v2/predictions/";
const cache = new Map();
function norm(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function pickRows(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["results", "predictions", "data", "items", "calls", "forecasts"]) {
    if (Array.isArray(payload && payload[key])) return payload[key];
  }
  if (payload && payload.data && typeof payload.data === "object") return pickRows(payload.data);
  if (payload && payload.results && typeof payload.results === "object") return pickRows(payload.results);
  return [];
}
function field(row, keys) {
  for (const key of keys) if (row && row[key] != null && row[key] !== "") return row[key];
  return null;
}
function unwrap(row) {
  return row && (row.event || row.fixture || row.match || row.game) || row || {};
}
function normalizeRow(row) {
  const event = unwrap(row);
  const home = field(event, ["home_team", "homeTeam", "home", "home_name", "homeTeamName"]);
  const away = field(event, ["away_team", "awayTeam", "away", "away_name", "awayTeamName"]);
  if (!home || !away) return null;
  const markets = row && row.markets || {};
  const matchResult = markets.match_result || {};
  const rawPick = field(row, ["prediction", "pick", "selection", "outcome", "tip", "recommended_pick", "label", "market_prediction"]) ??
    field(matchResult, ["predicted", "prediction", "pick"]) ??
    field(row && row.recommendations, ["favorite", "predicted", "pick"]);
  const pick = rawPick == null ? null :
    /^home$/i.test(String(rawPick)) ? String(home) + " win" :
    /^away$/i.test(String(rawPick)) ? String(away) + " win" :
    /^draw$/i.test(String(rawPick)) ? "Draw" : String(rawPick);
  const market = String(field(row, ["market", "market_name", "prediction_type", "bet_type", "type"]) || "match_result").toLowerCase();
  const confidenceRaw = Number(field(row, ["confidence", "confidence_pct", "probability", "probability_pct", "confidence_percent"]) ??
    field(row && row.model, ["confidence"]));
  const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(100, confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw)) : null;
  const p = row && (row.probabilities || row.probability || row.prediction_probabilities) || matchResult;
  const homeP = Number(field(p, ["home", "home_win", "home_win_probability", "home_win_pct", "prob_home"]) ?? field(row, ["home_win_probability", "home_win_pct", "prob_home"]));
  const drawP = Number(field(p, ["draw", "draw_probability", "draw_pct", "prob_draw"]) ?? field(row, ["draw_probability", "draw_pct", "prob_draw"]));
  const awayP = Number(field(p, ["away", "away_win", "away_win_probability", "away_win_pct", "prob_away"]) ?? field(row, ["away_win_probability", "away_win_pct", "prob_away"]));
  const hasProbabilities = [homeP, drawP, awayP].every(Number.isFinite) && homeP >= 0 && drawP >= 0 && awayP >= 0;
  return {
    home_team: String(home), away_team: String(away),
    home_key: norm(home), away_key: norm(away),
    pick: pick == null ? null : String(pick).slice(0, 180),
    market, confidence_pct: confidence,
    probabilities: hasProbabilities ? { home: homeP > 1 ? homeP : homeP * 100, draw: drawP > 1 ? drawP : drawP * 100, away: awayP > 1 ? awayP : awayP * 100 } : null,
    source: "BSD free prediction model", source_url: "https://sports.bzzoiro.com/predictions/"
  };
}
function sameTeam(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x)));
}
function internalPick(event) {
  const probs = event && event.model_probabilities;
  if (!probs) return null;
  const items = [
    { name: event.home_team + " win", value: Number(probs.home_win_pct) },
    { name: "Draw", value: Number(probs.draw_pct) },
    { name: event.away_team + " win", value: Number(probs.away_win_pct) }
  ].filter(item => Number.isFinite(item.value));
  items.sort((a, b) => b.value - a.value);
  return items[0] || null;
}
function classifyPick(pick, event) {
  const value = norm(pick);
  if (!value) return null;
  const home = norm(event.home_team), away = norm(event.away_team);
  const doubleChance = /avoiddefeat|doublechance|winordraw|ordraw|todraw/.test(value);
  if (value.includes(home) && !value.includes(away)) return doubleChance ? "home_or_draw" : "home";
  if (value.includes(away) && !value.includes(home)) return doubleChance ? "away_or_draw" : "away";
  if (/^draw$|^tie$|drawprediction|matchdraw/.test(value)) return "draw";
  if (/^(home|1)$|homewin|hometeamwin|1x$|hometoavoiddefeat/.test(value)) return "home";
  if (/^(away|2)$|awaywin|awayteamwin|x2$|awaytoavoiddefeat/.test(value)) return "away";
  if (/over15|over25|over35|under15|under25|under35|btts|bothteamstoscore/.test(value)) return "other_market";
  return null;
}
async function getBSDPredictions(fromDate, toDate) {
  const token = String(process.env.BSD_API_TOKEN || "").trim();
  if (!token) return { configured: false, predictions: [], message: "Optional external analyst not connected: add BSD_API_TOKEN from a free BSD account to enable independent predictions." };
  const key = fromDate + "|" + toDate;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const url = BASE + "?" + new URLSearchParams({ date_from: fromDate, date_to: toDate, limit: "200" }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", Authorization: "Token " + token }, signal: controller.signal });
    if (!response.ok) throw new Error("BSD prediction API HTTP " + response.status);
    const payload = await response.json();
    const predictions = pickRows(payload).map(normalizeRow).filter(Boolean);
    const value = { configured: true, predictions, message: predictions.length ? "BSD external predictions loaded." : "BSD returned no high-confidence calls for this date range." };
    cache.set(key, { value, expiresAt: Date.now() + 120000 });
    if (cache.size > 100) cache.delete(cache.keys().next().value);
    return value;
  } catch (error) {
    return { configured: true, predictions: [], message: error && error.name === "AbortError" ? "BSD prediction source timed out; Dream's own model remains available." : "BSD prediction source unavailable; Dream's own model remains available." };
  } finally { clearTimeout(timer); }
}
async function enrichWithAnalystConsensus(events, fromDate, toDate) {
  const external = await getBSDPredictions(fromDate, toDate);
  const output = events.map(event => {
    const row = external.predictions.find(item => sameTeam(item.home_team, event.home_team) && sameTeam(item.away_team, event.away_team));
    const dream = internalPick(event);
    const analysts = [];
    if (dream) analysts.push({ source: "Dream statistical model", pick: dream.name, probability_pct: dream.value });
    if (row && row.pick) analysts.push({ source: row.source, pick: row.pick, confidence_pct: row.confidence_pct, source_url: row.source_url, market: row.market });
    if (row && row.probabilities && event.model_probabilities) {
      const avg = key => Math.round(((Number(event.model_probabilities[key]) + Number(row.probabilities[key === "home_win_pct" ? "home" : key === "draw_pct" ? "draw" : "away"])) / 2) * 10) / 10;
      event.model_probabilities = { home_win_pct: avg("home_win_pct"), draw_pct: avg("draw_pct"), away_win_pct: avg("away_win_pct") };
      const candidates = [
        { key: "home", label: event.home_team + " win", value: event.model_probabilities.home_win_pct },
        { key: "draw", label: "Draw", value: event.model_probabilities.draw_pct },
        { key: "away", label: event.away_team + " win", value: event.model_probabilities.away_win_pct }
      ].sort((a, b) => b.value - a.value);
      event.market_favourite = { outcome: candidates[0].label, model_probability_pct: candidates[0].value };
      event.prediction_probability_method = "Average of Dream model and BSD model probabilities";
      if (event.market_prediction && event.market_prediction.type === "h2h") {
        event.market_prediction = { ...event.market_prediction, label: candidates[0].label, probability_pct: candidates[0].value };
      }
    }
    const externalClass = row ? classifyPick(row.pick, event) : null;
    const dreamClass = dream ? classifyPick(dream.name, event) : null;
    const agrees = Boolean(externalClass && dreamClass && (externalClass === dreamClass ||
      (externalClass === "home_or_draw" && dreamClass === "home") ||
      (externalClass === "away_or_draw" && dreamClass === "away")));
    const enoughVerifiedHistory = event.prediction_quality === "recent_team_form" &&
      event.confidence === "moderate";
    const verifiedAgreement = Boolean(enoughVerifiedHistory && agrees);
    const guardedEvent = verifiedAgreement ? event : {
      ...event,
      market_favourite: null,
      prediction_status: "no_verified_consensus",
      market_prediction: {
        ...(event.market_prediction || {}),
        type: event.market_prediction && event.market_prediction.type || "h2h",
        label: "No verified consensus prediction",
        probability_pct: null
      },
      warning: !enoughVerifiedHistory
        ? "Prediction withheld: recent verified team history is insufficient for a stronger estimate."
        : "Prediction withheld: Dream's model and the independent analyst do not agree on the outcome."
    };
    return {
      ...guardedEvent,
      external_analysis: row ? { source: row.source, pick: row.pick, confidence_pct: row.confidence_pct, market: row.market, source_url: row.source_url, probabilities: row.probabilities } : null,
      analyst_consensus: {
        analysts,
        available_count: analysts.length,
        agreement_count: agrees ? 2 : 0,
        agreement_pct: analysts.length > 1 ? (agrees ? 100 : 0) : null,
        label: analysts.length < 2 ? "No independent agreement" : agrees ? "Models agree" : "Models differ",
        external_source_status: external.message
      }
    };
  });
  return { events: output, source: external.predictions.length ? "BSD free prediction model" : null, status: external.message, configured: external.configured };
}
module.exports = { enrichWithAnalystConsensus };
