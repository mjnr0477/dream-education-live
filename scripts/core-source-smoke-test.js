"use strict";

const assert = require("assert");
const core = require("../product/global_sources/providers/core");
const catalog = require("../product/global_sources/catalog");
const router = require("../product/global_sources/router");

async function main() {
  const source = catalog.getSource("core");
  assert.ok(source, "CORE catalog entry exists");
  assert.strictEqual(source.status, "connected");
  assert.strictEqual(source.commercial_use, false, "record-specific licensing must not be treated as blanket commercial permission");

  assert.ok(router.providerIds({domain:"research"}).includes("core"), "CORE participates in research searches");
  assert.ok(router.providerIds({domain:"education"}).includes("core"), "CORE participates in education searches");
  assert.ok(router.providerIds({domain:"general"}).includes("core"), "CORE participates in general searches");

  const normalized = core.normalizeRecord({
    title:"Adaptive learning research",
    abstract:"A study of adaptive learning.",
    authors:[{name:"A. Researcher"}],
    year:2025,
    doi:"10.1234/example",
    downloadUrl:"https://repository.example/paper.pdf",
    isOpenAccess:true
  }, "adaptive learning");

  assert.ok(normalized, "valid CORE records normalize");
  assert.strictEqual(normalized.provider, "core");
  assert.strictEqual(normalized.source, "CORE");
  assert.match(normalized.extract, /A study of adaptive learning/);
  assert.match(normalized.extract, /A. Researcher/);
  assert.strictEqual(normalized.url, "https://repository.example/paper.pdf");
  assert.strictEqual(normalized.open_access, true);
  assert.strictEqual(core.normalizeRecord({abstract:"missing title"}, "query"), null);

  const originalKey = process.env.CORE_API_KEY;
  delete process.env.CORE_API_KEY;
  assert.deepStrictEqual(await core.search("adaptive learning", 3), [], "CORE safely stays inactive without a configured API key");
  if (originalKey === undefined) delete process.env.CORE_API_KEY;
  else process.env.CORE_API_KEY = originalKey;

  console.log("CORE SOURCE SMOKE TEST: PASS");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
