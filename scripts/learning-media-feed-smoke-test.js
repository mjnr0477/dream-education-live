"use strict";

const assert = require("assert");
const fs = require("fs");

const workspace = fs.readFileSync("public/frontend-workspace.js", "utf8");
const app = fs.readFileSync("public/app.js", "utf8");
const css = fs.readFileSync("public/style.css", "utf8");
const engineSource = fs.readFileSync("product/universal_learning_resource_engine.js", "utf8");
const engine = require("../product/universal_learning_resource_engine");

assert.ok(workspace.includes("de-learn-hub-grid"), "Learn should open as a clean button hub.");
assert.ok(app.includes('if (name === "learn" && existingAuth && existingAuth.account)'), "Authenticated landing-page Learn must open the real learner workspace.");
assert.ok(app.includes('currentTitle.trim().toLowerCase() === "start learning."'), "Logged-out Learn primary action must lead to sign-in instead of doing nothing.");
assert.ok(workspace.includes('data-de-action="progress"'), "Progress should be behind its own button.");
assert.ok(workspace.includes('value="video,image,experiment"'), "The default feed should search only media types.");
assert.ok(workspace.includes("de-learning-feed"), "Search results should render in a vertical media feed.");
assert.ok(workspace.includes("de-feed-image"), "Photos must render inline.");
assert.ok(workspace.includes("de-feed-experiment"), "Interactive experiments must render inline.");
assert.ok(workspace.includes("data-resource-check"), "Learners must be able to check understanding.");
assert.ok(css.includes(".de-learning-feed"), "Feed container styles are required.");
assert.ok(css.includes("scroll-snap-type:y mandatory"), "Feed should snap vertically between items.");
assert.ok(css.includes(".de-learn-hub-grid"), "Button-first Learn layout styles are required.");

assert.deepStrictEqual(engine.wantedTypes("video,image,experiment"), ["video", "image", "experiment"]);
assert.deepStrictEqual(engine.wantedTypes("photos"), ["image"]);
assert.strictEqual(engine.isPlayableResource({ type: "image", media_url: "https://example.org/biology.jpg" }), true);
assert.strictEqual(engine.isPlayableResource({ type: "experiment", embed_url: "https://phet.colorado.edu/sims/html/example/latest/example_en.html" }), true);
assert.strictEqual(engine.isPlayableResource({ type: "experiment", url: "https://example.org/experiment" }), false);
assert.ok(engine.scoreResource({ title: "Photosynthesis process", description: "How plants make food" }, "photosynthesis") >= 0.35);

new Function(workspace);
new Function(app);
new Function(engineSource);

console.log("Learning media feed smoke test passed.");
