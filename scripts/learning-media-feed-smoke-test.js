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
assert.ok(/function openAdaptive\(\)\s*\{[\s\S]*?window\.openAdaptiveQuestion\(\)/.test(workspace), "Adaptive Learning must call the existing adaptive question flow directly.");
assert.ok(/function openAsk\(\)\s*\{[\s\S]*?window\.DreamEducationLearner\.openAsk\(\)/.test(workspace), "Ask Dream must call the existing Ask Dream flow directly.");
assert.ok(!/function openAdaptive\(\)[\s\S]*?const learnerButton = document\.querySelector\('\[data-action="open"\]\[data-panel="learn"\]'\)/.test(workspace), "Adaptive Learning must not loop back to the Learn landing panel.");
assert.ok(!/function openAsk\(\)[\s\S]*?const learn = document\.querySelector\('\[data-action="open"\]\[data-panel="learn"\]'\)/.test(workspace), "Ask Dream must not loop back to the Learn landing panel.");
const learnerHub = workspace.slice(workspace.indexOf("async function loadLearnerWorkspace"), workspace.indexOf("function roleMetricValue"));
assert.ok(!learnerHub.includes('data-de-action="sessions"'), "Keep the Learn hub uncluttered; sessions remain available elsewhere.");
assert.ok(!learnerHub.includes('data-de-action="connections"'), "Keep connections out of the primary Learn choices.");
assert.ok(workspace.includes('value="video,image,experiment"'), "The default feed should search only media types.");
assert.ok(workspace.includes("de-learning-feed"), "Search results should render in a vertical media feed.");
assert.ok(workspace.includes("de-feed-image"), "Photos must render inline.");
assert.ok(workspace.includes('limit: "20"'), "The feed should request an expanded set of learning resources.");
assert.ok(workspace.includes("Sources returning results:"), "The feed should report which media providers actually returned results.");
assert.ok(css.includes("width:min(920px,100vw)"), "The experience frame should be wide enough for an immersive feed.");
assert.ok(css.includes("height:min(76svh,780px)"), "The media feed should use a sizable viewport with snap-scrolling cards.");
assert.ok(workspace.includes("de-feed-experiment"), "Interactive experiments must render inline.");
assert.ok(workspace.includes("data-resource-check"), "Learners must be able to check understanding.");
assert.ok(css.includes(".de-learning-feed"), "Feed container styles are required.");
assert.ok(workspace.includes("data-feed-playback-status"), "Direct-video cards must provide an accessible playback recovery status.");
assert.ok(workspace.includes("Playback was blocked. Tap to retry."), "Autoplay rejection must provide a learner-controlled retry.");
assert.ok(workspace.includes('video.addEventListener("error"'), "Failed media loads must be surfaced instead of failing silently.");
assert.ok(workspace.includes("video.dataset.feedRecoveryWired"), "Playback recovery handlers must not be duplicated.");
assert.ok(css.includes(".de-feed-playback-status[hidden]"), "Playback status must respect its hidden state.");
assert.ok(css.includes("scroll-snap-type:y mandatory"), "Feed should snap vertically between items.");
assert.ok(css.includes(".de-learn-hub-grid"), "Button-first Learn layout styles are required.");

assert.deepStrictEqual(engine.wantedTypes("video,image,experiment"), ["video", "image", "experiment"]);
assert.deepStrictEqual(engine.wantedTypes("photos"), ["image"]);
assert.strictEqual(engine.isPlayableResource({ type: "image", media_url: "https://example.org/biology.jpg" }), true);
assert.strictEqual(engine.isPlayableResource({ type: "experiment", embed_url: "https://phet.colorado.edu/sims/html/example/latest/example_en.html" }), true);
assert.strictEqual(engine.isPlayableResource({ type: "experiment", url: "https://example.org/experiment" }), false);
assert.strictEqual(typeof engine.searchLibraryOfCongressImages, "function", "Library of Congress image search should be connected as an additional free media provider.");
assert.ok(engine.scoreResource({ title: "Photosynthesis process", description: "How plants make food" }, "photosynthesis") >= 0.35);
(async function verifyInteractiveExperiments() {
  const naturalSelection = await engine.searchPhetExperiments("natural selection", 4);
  assert.strictEqual(naturalSelection[0].embed_url, "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html");
  const fractions = await engine.searchPhetExperiments("fractions", 4);
  assert.ok(fractions.length > 0, "Math topics should surface an in-feed interactive experiment.");
  const greenhouse = await engine.searchPhetExperiments("climate", 4);
  assert.strictEqual(greenhouse[0].embed_url, "https://phet.colorado.edu/sims/html/greenhouse/latest/greenhouse_en.html");
  new Function(workspace);
  new Function(app);
  new Function(engineSource);
  console.log("Learning media feed smoke test passed.");
})().catch(function (error) { console.error(error); process.exitCode = 1; });
