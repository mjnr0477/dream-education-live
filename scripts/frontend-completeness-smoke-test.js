"use strict";

const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const index = read("public/index.html");
const app = read("public/app.js");
const workspace = read("public/frontend-workspace.js");
const nextgen = read("public/nextgen-visual.js");
const css = read("public/nextgen-visual.css");
const server = read("server.js");

const requiredFiles = [
  "public/index.html",
  "public/style.css",
  "public/app.js",
  "public/frontend-workspace.js",
  "public/nextgen-visual.js",
  "public/nextgen-visual.css"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error("Missing frontend file: " + file);
}

const requiredFrontendRoutes = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/adaptive",
  "/api/next-question",
  "/api/session",
  "/api/product/teacher",
  "/api/product/parent",
  "/api/product/school",
  "/api/paypal/create-order",
  "/api/paypal/capture-order"
];

for (const route of requiredFrontendRoutes) {
  if (!app.includes(route) && !workspace.includes(route)) {
    throw new Error("Required frontend integration missing: " + route);
  }
}

const requiredServerRoutes = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/paypal/create-order",
  "/api/paypal/capture-order",
  "/api/product/teacher",
  "/api/product/parent",
  "/api/product/school",
  "/api/adaptive",
  "/api/learning-cycle"
];

for (const route of requiredServerRoutes) {
  if (!server.includes(route)) {
    throw new Error("Required server route missing: " + route);
  }
}

for (const token of [
  "/nextgen-visual.js?v=20261010a",
  "/frontend-workspace.js?v=20261010a"
]) {
  if (!index.includes(token)) throw new Error("Required frontend script missing: " + token);
}

const requiredCompactDestinations = [
  'data-panel="learn"', 'data-panel="teach"', 'data-panel="connect"',
  'data-panel="tools"', 'data-panel="school"', 'data-panel="about"',
  'id="dream-search-form"', 'id="dream-search-input"', 'id="dream-search-results"',
  'id="experience-panel"', 'id="panel-body"', 'data-panel="signin"', 'data-panel="join"', 'data-panel-action="subscription"'
];
for (const token of requiredCompactDestinations) {
  if (!index.includes(token) && !nextgen.includes(token)) {
    throw new Error("Required compact landing destination or wired interaction missing: " + token);
  }
}
for (const token of [
  'className = "de-landing-destinations"',
  'data-panel="learn"', 'data-panel="teach"', 'data-panel="connect"',
  'data-panel="tools"', 'data-panel="school"', 'data-panel="about"',
  'searchShell.classList.add("de-compact-search")',
  'node.remove()'
]) {
  if (!nextgen.includes(token)) throw new Error("Compact landing behavior missing: " + token);
}
if (index.includes('class="gateway-section"') || index.includes('class="statement-section"') || index.includes('class="cta-section"') || index.includes('class="landing-subscribe"') || index.includes('class="footer"') || index.includes('class="floating-card')) {
  throw new Error("Legacy long-scroll landing sections must not be present in the HTML.");
}
if (!css.includes(".de-landing-destinations") || !css.includes("height: 100svh")) {
  throw new Error("Compact one-screen landing layout rules are missing.");
}
if (index.includes("across Dream Education's connected sources,\\n            across Dream Education's connected public sources.")) {
  throw new Error("Duplicate Dream Search description remains.");
}

if (!app.includes('if (action === "signin") {') || !app.includes('openPanel("signin")')) {
  throw new Error("Dynamically rendered sign-in actions must open the shared sign-in panel.");
}

if (!app.includes('if (action === "close") {') || !app.includes("closePanel();")) {
  throw new Error("Dynamically rendered close actions must close the shared panel.");
}

const primaryDispatcherCount = app.split('if (action === "primary")').length - 1;
if (primaryDispatcherCount !== 1 ||
    !app.includes('currentTitle.trim() === "Education, together."') ||
    !app.includes('currentTitle.trim().toLowerCase() === "stay connected."')) {
  throw new Error("Primary panel actions must route both school-dashboard and teacher-connections actions.");
}

if (!index.includes('data-panel-action="subscription"') || !app.includes("function openSubscription") || !app.includes("handlePayPalReturn")) {
  throw new Error("Subscription/PayPal flow is missing.");
}

if (/Test Learner View/.test(app)) {
  throw new Error("Non-functional teacher test control remains.");
}

// Audit statically declared panel actions against the shared dispatcher so a new
// dynamically rendered button cannot silently become inert without a regression failure.
const declaredPanelActions = new Set(
  [...app.matchAll(/data-panel-action=["']([^"'$]+)["']/g)].map(match => match[1])
);
for (const action of declaredPanelActions) {
  if (!app.includes('action === "' + action + '"')) {
    throw new Error("Panel action has no matching dispatcher branch: " + action);
  }
}

const declaredWorkspaceActions = new Set(
  [...workspace.matchAll(/data-de-action=["']([^"'$]+)["']/g)].map(match => match[1])
);
for (const action of declaredWorkspaceActions) {
  if (!workspace.includes('name === "' + action + '"')) {
    throw new Error("Workspace action has no matching dispatcher branch: " + action);
  }
}

const declaredPrimaryActions = new Set(
  [...(index + app).matchAll(/data-action=["']([^"'$]+)["']/g)].map(match => match[1])
);
for (const action of declaredPrimaryActions) {
  if (!app.includes('action === "' + action + '"')) {
    throw new Error("Primary navigation action has no matching dispatcher branch: " + action);
  }
}

for (const [name, source] of [["public/index.html", index], ["public/app.js", app], ["public/frontend-workspace.js", workspace]]) {
  if (/<a\b/i.test(source) || /target\s*=\s*["\']_blank/i.test(source)) {
    throw new Error("Learner-facing frontend must not render material links: " + name);
  }
}

if (!workspace.includes("<video") || !workspace.includes("<audio") || !workspace.includes("Source:")) {
  throw new Error("Inline text/video/audio material experience is incomplete.");
}

if (app.includes('data-answer-resource-type="image"') || app.includes('data-answer-resource-type="experiment"')) {
  throw new Error("Learner resource choices must be limited to video, text and audio.");
}
if (app.includes("<a ") || workspace.includes("<a ")) {
  throw new Error("Learner-facing frontend must not render anchor links.");
}

console.log("Frontend completeness smoke test passed.");
