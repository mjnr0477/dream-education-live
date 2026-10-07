"use strict";

const fs = require("fs");
const assert = require("assert");

const intent = fs.readFileSync("product/learning_resource_intent.js", "utf8");
const engine = fs.readFileSync("product/universal_learning_resource_engine.js", "utf8");
const app = fs.readFileSync("public/app.js", "utf8");
const css = fs.readFileSync("public/style.css", "utf8");

for (const signal of [
  "extractLearningTopic",
  "show\\s+me",
  "photo|photos|picture|pictures|image|images",
  "video|videos|movie|movies",
  "audio|sound|sounds|podcast|recording"
]) {
  assert.ok(intent.includes(signal), "topic extraction missing: " + signal);
}

for (const signal of [
  "extractLearningTopic(learnerQuery)",
  "resource_topic: conceptQuery",
  'safeProvider("wikimedia_commons"',
  "relevance_reason",
  "searchOpenverseImages",
  "searchOpenverseAudio"
]) {
  assert.ok(engine.includes(signal), "media source hardening missing: " + signal);
}

for (const signal of [
  "de-lesson-listen",
  "speechSynthesis",
  "SpeechSynthesisUtterance",
  "de-lesson-stop",
  "de-resource-image",
  "de-resource-audio-player",
  "de-resource-video",
  "de-resource-experiment"
]) {
  assert.ok(app.includes(signal), "learner media experience missing: " + signal);
}

for (const signal of [
  ".de-lesson-actions",
  ".de-resource-image",
  ".de-resource-video",
  ".de-resource-audio"
]) {
  assert.ok(css.includes(signal), "media UI CSS missing: " + signal);
}

console.log("universal-media-experience-smoke-test: PASS");
