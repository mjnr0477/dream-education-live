"use strict";
const fs = require("fs");
const assert = require("assert");

const app = fs.readFileSync("public/app.js","utf8");
const css = fs.readFileSync("public/style.css","utf8");

for (const signal of [
  'fetch("/api/learn"',
  'answer_verified',
  'VERIFIED LESSON',
  'de-resource-level',
  'Early learner',
  'Primary school',
  'Secondary school',
  'Tertiary / university',
  'Professional',
  'Watch video',
  'Listen to audio',
  'de-resource-video-player',
  'de-resource-audio-player',
  'Video, text and audio learning'
]) {
  assert.ok(app.includes(signal), "lesson player missing: " + signal);
}
assert.ok(css.includes(".de-lesson-card"), "lesson card CSS missing");
assert.ok(css.includes(".de-resource-video-player"), "video player CSS missing");
console.log("multimodal-lesson-player-smoke-test: PASS");
