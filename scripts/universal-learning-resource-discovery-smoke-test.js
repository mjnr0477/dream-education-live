const assert = require("assert");
const engine = require("../product/universal_learning_resource_engine");

async function main() {
  assert.strictEqual(typeof engine.discoverLearningResources, "function");
  assert.strictEqual(typeof engine.searchYouTube, "function");
  const result = await engine.discoverLearningResources("photosynthesis", { type: ["image"], limit: 1 });
  assert.strictEqual(result.success, true);
  assert.ok(Array.isArray(result.resources));
  console.log("Universal learning resource discovery smoke test passed.");
}

main().catch(error => { console.error(error); process.exit(1); });
