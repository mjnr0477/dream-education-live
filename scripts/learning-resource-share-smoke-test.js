"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "frontend-workspace.js"), "utf8");
assert.ok(source.includes("function getPublicResourceShareUrl(resource)"), "Must resolve a public URL before sharing.");
assert.ok(source.includes("resource.canonical_url, resource.original_url, resource.source_url, resource.url"), "Must prefer canonical/original source links.");
assert.ok(source.includes('parsed.protocol !== "https:" && parsed.protocol !== "http:"'), "Only HTTP(S) URLs may be shared.");
assert.ok(source.includes('host === "localhost"') && source.includes('host === "0.0.0.0"') && source.includes("127\\\\."), "Must reject localhost and loopback links.");
assert.ok(source.includes("youtubeEmbed") && source.includes("https://www.youtube.com/watch?v="), "YouTube embed URLs must be converted to public watch URLs.");
assert.ok(source.includes("data-resource-share="), "Resource cards must expose a share action.");
assert.ok(source.includes("navigator.share(shareData)"), "Must use native share when supported.");
assert.ok(source.includes("navigator.clipboard.writeText(url)"), "Must copy the public link when native share is unavailable.");
assert.ok(source.includes("if (resource) shareLearningResource(resource)"), "The share button must call the share handler.");

console.log("Learning resource online-share smoke test passed.");
