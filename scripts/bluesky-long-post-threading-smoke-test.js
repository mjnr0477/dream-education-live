"use strict";

const assert = require("node:assert/strict");
const { splitBlueskyText } = require("../product/native_messenger_connectors");

function graphemeCount(value) {
  return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)).length;
}

const short = "Hello from Dream Education.";
assert.deepEqual(splitBlueskyText(short), [short], "Short posts should remain a single post.");

const long = ("Dream Education shares verified learning information with learners. ").repeat(10);
const chunks = splitBlueskyText(long);
assert.ok(chunks.length > 1, "Long messages should split into a thread.");
assert.equal(chunks.join(""), long, "Splitting must preserve every character in the original message.");
assert.ok(chunks.every((chunk) => graphemeCount(chunk) <= 300), "Every post must stay within Bluesky's 300-grapheme limit.");

const emojiText = "👨‍👩‍👧‍👦".repeat(100);
const emojiChunks = splitBlueskyText(emojiText);
assert.equal(emojiChunks.join(""), emojiText, "Emoji grapheme clusters must be preserved.");
assert.ok(emojiChunks.every((chunk) => graphemeCount(chunk) <= 300), "Emoji posts must also stay within the limit.");

console.log("BLUESKY LONG-POST THREADING: PASS");
console.log("Long messages split into valid thread-sized posts without dropping text.");
