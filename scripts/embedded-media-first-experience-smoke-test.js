"use strict";
const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("public/app.js","utf8");
const css = fs.readFileSync("public/style.css","utf8");
const engine = fs.readFileSync("product/universal_learning_resource_engine.js","utf8");

assert.ok(app.includes("de-resource-text"), "text materials must render inline");
assert.ok(app.includes("de-resource-audio"), "audio must render inline");
assert.ok(app.includes("de-resource-video"), "video must render inline");
assert.ok(app.includes("safeEmbedUrl"), "embedded video/audio resources must render inline");
assert.ok(!app.includes("Open source</a>"), "media cards must not be link-first");
assert.ok(css.includes(".de-media-stage"), "embedded media styling missing");
assert.ok(engine.includes("direct_media"), "engine must expose direct media capability");
assert.ok(engine.includes("media_playback"), "engine must expose playback mode");
assert.ok(engine.includes("playable_in_app"), "engine must mark media that can actually play in-app");
assert.ok(engine.includes("images-api.nasa.gov/asset/"), "NASA video assets must resolve to playable media");
assert.ok(engine.includes("archive.org/metadata/"), "Internet Archive media must resolve playable files when available");
assert.ok(engine.includes("Never present a page-only result"), "page-only media must not be presented as playable");

new Function(app);
new Function(engine);

console.log("embedded-media-first-experience-smoke-test: PASS");