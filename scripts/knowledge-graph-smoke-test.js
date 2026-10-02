"use strict";

const assert = require("assert");
const graph = require("../content/global/knowledge_graph");

const prerequisitesOfIntegers = graph.getPrerequisites("math-integers").map(x => x.id);
assert.deepStrictEqual(prerequisitesOfIntegers, ["math-natural-numbers"]);

const dependentsOfNaturalNumbers = graph.getDependents("math-natural-numbers").map(x => x.id);
assert.deepStrictEqual(dependentsOfNaturalNumbers, ["math-integers"]);

const dependentsOfIntegers = graph.getDependents("math-integers").map(x => x.id);
assert.deepStrictEqual(dependentsOfIntegers, ["math-rational-numbers"]);

const chain = graph.getPrerequisiteChain("math-rational-numbers").map(x => x.id);
assert.deepStrictEqual(chain, ["math-integers", "math-natural-numbers"]);

const validation = graph.validateGraph();
assert.strictEqual(validation.valid, true);

console.log("Knowledge graph smoke test passed");
