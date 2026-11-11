"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const workspace = fs.readFileSync(path.join(root, "public", "frontend-workspace.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "public", "service-worker.js"), "utf8");
const style = fs.readFileSync(path.join(root, "public", "style.css"), "utf8");

assert.ok(workspace.includes('const FEED_DATA_SAVER_KEY = "dream_education_feed_data_saver"'), "The learner's manual choice must persist locally.");
assert.ok(workspace.includes("connection.saveData === true"), "The feed should respect browser data-saver signals.");
assert.ok(workspace.includes('slow-2g|2g'), "The feed should enable data saver automatically on very slow connections.");
assert.ok(workspace.includes('data-feed-data-saver') || workspace.includes('id="de-feed-data-saver"'), "The feed must expose a user-controlled data saver toggle.");
assert.ok(workspace.includes("data-feed-load-media"), "Deferred media must load only through an explicit action.");
assert.ok(workspace.includes("loadDeferredFeedMedia(resource, index, loadMediaButton)"), "The explicit load action must use the matching resource.");
assert.ok(workspace.includes("safeFeedMediaUrl"), "Deferred media URLs must be checked before assigning them to media elements.");
assert.ok(workspace.includes('stage.replaceChildren(element)'), "Media should be inserted only after the user requests it.");
assert.ok(workspace.includes('if (workspace) wireFeedPlayback(workspace)'), "Deferred images must retain the feed media recovery handlers.");
assert.ok(style.includes(".de-feed-data-saver") && style.includes(".de-feed-media-deferred"), "Data saver controls must have responsive styling.");
assert.ok(index.includes("/frontend-workspace.js?v=20261111b"), "The updated feed script must bypass older browser caches.");
assert.ok(worker.includes("/frontend-workspace.js?v=20261111b"), "The offline shell must precache the updated feed script.");
console.log("Learning Feed data saver smoke test passed.");
