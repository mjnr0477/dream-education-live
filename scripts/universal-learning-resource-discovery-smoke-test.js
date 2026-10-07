const assert = require("assert");
const engine = require("../product/universal_learning_resource_engine");

async function main() {
  assert.strictEqual(typeof engine.discoverLearningResources, "function");
  assert.strictEqual(typeof engine.searchYouTube, "function");
  const empty = await engine.discoverLearningResources("");
  assert.strictEqual(empty.success, false);
  assert.deepStrictEqual(await engine.searchYouTube("photosynthesis", 2), []);
  console.log("Universal learning resource discovery smoke test passed.");
}

main().catch(error => { console.error(error); process.exit(1); });
