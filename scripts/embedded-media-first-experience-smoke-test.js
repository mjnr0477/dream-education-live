"use strict";
const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("public/app.js","utf8");
const css = fs.readFileSync("public/style.css","utf8");
const engine = fs.readFileSync("product/universal_learning_resource_engine.js","utf8");

assert.ok(app.includes("<img class=\"de-resource-image\""), "images must render inline");
assert.ok(app.includes("<audio class=\"de-resource-audio\""), "audio must render inline");
assert.ok(app.includes("<video class=\"de-resource-video\""), "video must render inline");
assert.ok(app.includes("<iframe src=\"' + escapeHtml(safeEmbedUrl)"), "embedded resources must render inline");
assert.ok(!app.includes("Open source</a>"), "media cards must not be link-first");
assert.ok(css.includes(".de-media-stage"), "embedded media styling missing");
assert.ok(engine.includes("direct_media"), "engine must expose direct media capability");
assert.ok(engine.includes("media_playback"), "engine must expose playback mode");

new Function(app);
new Function(engine);

console.log("embedded-media-first-experience-smoke-test: PASS");
