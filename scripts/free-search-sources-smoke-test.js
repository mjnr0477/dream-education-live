"use strict";

const assert = require("assert");
const router = require("../product/global_sources/router");
const catalog = require("../product/global_sources/catalog");
const googleBooks = require("../product/global_sources/providers/google_books");
const fs = require("fs");
const sourceEngine = fs.readFileSync(require.resolve("../product/source_engine"), "utf8");

async function main() {
  for (const id of ["crossref", "arxiv", "google_books"]) {
    const source = catalog.getSource(id);
    assert.ok(source, `catalog entry exists: ${id}`);
    assert.strictEqual(source.status, "connected", `${id} is marked connected`);
  }

  assert.ok(router.providerIds({domain:"research"}).includes("core"));
  assert.ok(sourceEngine.includes('name: "crossref"'), "Crossref remains in the direct source engine");
  assert.ok(sourceEngine.includes('name: "arxiv"'), "arXiv remains in the direct source engine");
  assert.ok(router.providerIds({domain:"education"}).includes("google_books"));
  assert.ok(router.providerIds({domain:"general"}).includes("google_books"));
  assert.ok(sourceEngine.includes("return Array.isArray(result?.sources) ? result.sources : [];"),
    "trusted global mesh must pass provider results into Dream Search");

  const originalKey = process.env.GOOGLE_BOOKS_API_KEY;
  delete process.env.GOOGLE_BOOKS_API_KEY;
  assert.deepStrictEqual(await googleBooks.search("open textbooks", 3), [],
    "Google Books stays safely inactive until its API key is configured");
  if (originalKey === undefined) delete process.env.GOOGLE_BOOKS_API_KEY;
  else process.env.GOOGLE_BOOKS_API_KEY = originalKey;

  console.log("FREE SEARCH SOURCES SMOKE TEST: PASS");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
