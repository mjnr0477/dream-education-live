"use strict";

const fs = require("fs");
const assert = require("assert");

const app = fs.readFileSync("public/app.js", "utf8");
const engine = fs.readFileSync("product/universal_learning_resource_engine.js", "utf8");
const css = fs.readFileSync("public/style.css", "utf8");

const requiredAppSignals = [
  'data-panel-action="multimodal-learning"',
  'MULTIMODAL LEARNING',
  'Choose how you learn.',
  '/api/v1/learning/resources?',
  '/api/v1/learning/resources/progress',
  'de-resource-mode',
  'Watch video',
  'Read text',
  'Listen to audio',
  'Read an explanation',
  'de-resource-text',
  'de-resource-audio-player',
  'de-resource-video-player'
];

for (const signal of requiredAppSignals) {
  assert.ok(app.includes(signal), "frontend missing multimodal signal: " + signal);
}

assert.ok(
  engine.includes('embed_url: item.identifier && (type === "video" || type === "audio")'),
  "Internet Archive audio/video embed support is missing"
);

for (const signal of [
  ".de-resource-grid",
  ".de-resource-video",
  ".de-resource-video-player",
  ".de-resource-audio",
  ".de-resource-text"
]) {
  assert.ok(css.includes(signal), "frontend CSS missing media surface: " + signal);
}

console.log("multimodal-learning-smoke-test: PASS");