"use strict";

const assert = require("assert");
const { inferLearningResourceIntent } = require("../product/learning_resource_intent");

function run() {
  let result = inferLearningResourceIntent("I want to learn photosynthesis through a video");
  assert.deepStrictEqual(result.types, ["video"]);
  assert.strictEqual(result.mode, "natural_language");

  result = inferLearningResourceIntent("show me a picture or diagram of the heart");
  assert.deepStrictEqual(result.types, ["image"]);

  result = inferLearningResourceIntent("let me do an experiment or simulation about electricity");
  assert.deepStrictEqual(result.types, ["experiment"]);

  result = inferLearningResourceIntent("give me anything that helps with algebra");
  assert.deepStrictEqual(result.types, ["any"]);
  assert.strictEqual(result.mode, "broad_discovery");

  result = inferLearningResourceIntent("learn this", "research");
  assert.deepStrictEqual(result.types, ["research"]);
  assert.strictEqual(result.mode, "explicit");

  console.log("Universal learning resource intent smoke test passed.");
}

run();
