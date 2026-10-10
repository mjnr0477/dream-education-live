"use strict";
const fs=require("fs"); const assert=require("assert");
const engine=fs.readFileSync("product/universal_learning_resource_engine.js","utf8");
const app=fs.readFileSync("public/app.js","utf8");
for(const s of ["Circuit Construction Kit: DC","greenhouse","gas-properties","moving-man","projectile-motion","forces-and-motion-basics","density"]) assert.ok(engine.includes(s),"missing live demo mapping: "+s);
assert.ok(engine.includes('type:"experiment"') && engine.includes("embed_url:"),"experiment embed support missing");
assert.ok(app.includes('type === "experiment" || type === "interactive"'),"frontend experiment player missing");
console.log("phet-live-demonstrations-smoke-test: PASS");
